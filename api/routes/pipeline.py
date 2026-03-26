import json
import os
import shutil

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from api.models import (
    ApproveRequest,
    ApproveResponse,
    SceneOut,
    StartResponse,
    StoryboardResponse,
)
from api import state_store
from api.routes._helpers import run_scene_pipeline, version_initial_scenes

router = APIRouter(prefix="/pipeline", tags=["pipeline"])

# Uploads folder sits inside coreutils/ so all relative paths remain consistent
UPLOADS_DIR = "uploads"


def _scenes_with_images(scenes: list, images: dict) -> list[SceneOut]:
    """Merge scene dicts with their corresponding image paths."""
    result = []
    for scene in scenes:
        sid = scene["scene_id"]
        result.append(
            SceneOut(
                scene_id=sid,
                title=scene["title"],
                script=scene["script"],
                visual_description=scene["visual_description"],
                duration=scene["duration"],
                image=images.get(sid),
            )
        )
    return result


@router.post("/start", response_model=StartResponse)
async def start_pipeline(
    file: UploadFile = File(...),
    level_of_explanation: str = Form("basic"),
):
    """
    Upload a document and run the full initial storyboard pipeline:
    scene_generation → grounding → image_generation.
    """
    # Lazy imports so coreutils path is already set by the time we import
    from main import load_document
    from logger import clear_log

    print("[API] Pipeline started")

    # ── Save uploaded file ──────────────────────────────────────────────────
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    dest = os.path.join(UPLOADS_DIR, file.filename)
    with open(dest, "wb") as out:
        shutil.copyfileobj(file.file, out)

    # ── Load document text ──────────────────────────────────────────────────
    try:
        document_text = load_document(dest)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Document loading failed: {exc}")

    # ── Initialise global state ─────────────────────────────────────────────
    clear_log()
    state_store.pipeline_state.clear()
    state_store.active_scene_versions.clear()
    state_store.scene_version_counter.clear()
    state_store.scene_voices.clear()
    state_store.pipeline_state.update(
        {
            "document": document_text,
            "summary": "",
            "scenes": [],
            "images": {},
            "edit_request": "",
            "edit_scene_id": None,
            "level_of_explanation": level_of_explanation,
        }
    )

    # ── Run pipeline agents ─────────────────────────────────────────────────
    state = run_scene_pipeline(state_store.pipeline_state)
    state_store.pipeline_state.update(state)

    # ── Rename initial images + record v1 content per scene ──────────────────
    version_initial_scenes(
        state_store.pipeline_state["scenes"],
        state_store.pipeline_state["images"],
    )

    scenes_out = _scenes_with_images(
        state_store.pipeline_state["scenes"],
        state_store.pipeline_state["images"],
    )

    return StartResponse(
        scenes=scenes_out,
        images={str(k): v for k, v in state_store.pipeline_state["images"].items()},
    )


@router.get("/storyboard", response_model=StoryboardResponse)
async def get_storyboard():
    """Return the latest storyboard version from storyboard_log.json."""
    log_path = "storyboard_log.json"

    if not os.path.isfile(log_path):
        raise HTTPException(
            status_code=404, detail="No storyboard found — run /pipeline/start first."
        )

    try:
        with open(log_path, encoding="utf-8") as f:
            versions = json.load(f)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="storyboard_log.json is corrupted.")

    if not versions:
        raise HTTPException(status_code=404, detail="Storyboard log is empty.")

    latest = versions[-1]

    scenes_out = [
        SceneOut(
            scene_id=s["scene_id"],
            title=s["title"],
            script=s["script"],
            visual_description=s["visual_description"],
            duration=s["duration"],
            image=s.get("image"),
        )
        for s in latest["scenes"]
    ]

    return StoryboardResponse(
        version=latest["version"],
        label=latest.get("label", ""),
        timestamp=latest.get("timestamp", ""),
        scenes=scenes_out,
    )


@router.post("/approve", response_model=ApproveResponse)
async def approve_storyboard(body: ApproveRequest):
    """Generate the final MP4 video from the approved storyboard."""
    from video_gen import generate_video

    if not state_store.pipeline_state:
        raise HTTPException(
            status_code=400,
            detail="No active pipeline session. Run /pipeline/start first.",
        )

    print("[API] Video rendering started")
    print(f"[API] Selected scenes: {body.selected_scenes}")

    try:
        video_path = generate_video(
            active_versions=state_store.active_scene_versions or None,
            selected_scenes=body.selected_scenes,
            scene_voices=state_store.scene_voices or None,
            version_data=state_store.scene_version_data or None,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Video generation failed: {exc}")

    print(f"[API] Video ready: {video_path}")
    return ApproveResponse(video_path=video_path)
