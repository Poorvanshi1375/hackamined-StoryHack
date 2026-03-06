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
    # Lazy import so coreutils path is already set by the time we import
    from agents import scene_generation_agent, grounding_agent, image_generation_agent
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
    try:
        state = scene_generation_agent(state_store.pipeline_state)
        print("[API] Scenes generated")

        state = grounding_agent(state)
        print("[API] Scenes grounded")

        state = image_generation_agent(state)
        print("[API] Images generated")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Pipeline error: {exc}")

    state_store.pipeline_state.update(state)

    # ── Rename initial images + record v1 content per scene ──────────────────
    for scene in state_store.pipeline_state["scenes"]:
        sid = scene["scene_id"]
        raw_path = state_store.pipeline_state["images"].get(
            sid, f"images/scene_{sid}.png"
        )
        v1_path = f"images/scene_{sid}_v1.png"
        if os.path.isfile(raw_path) and raw_path != v1_path:
            os.rename(raw_path, v1_path)
        state_store.pipeline_state["images"][sid] = v1_path
        state_store.active_scene_versions[sid] = 1
        state_store.scene_version_counter[sid] = 1
        # Store the v1 scene content so the UI can show it when reverting
        state_store.scene_version_data.setdefault(sid, {})[1] = {
            "title": scene["title"],
            "script": scene["script"],
            "visual_description": scene["visual_description"],
            "duration": scene["duration"],
        }
        print(f"[API] Scene {sid} → {v1_path} (v1)")

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
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Video generation failed: {exc}")

    print(f"[API] Video ready: {video_path}")
    return ApproveResponse(video_path=video_path)
