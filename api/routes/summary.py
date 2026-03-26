"""
api/routes/summary.py
---------------------
Three endpoints that implement the document summary HITL stage:

  POST /summary/generate   – upload document file, run summary_generation_agent
  POST /summary/refine     – run summary_edit_agent with a user instruction
  POST /summary/approve    – accept summary + core_focus, run scene pipeline
"""

import os
import shutil

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from api.models import (
    ApproveSummaryRequest,
    RefineSummaryRequest,
    SceneOut,
    StartResponse,
    SummaryResponse,
)
from api import state_store
from api.routes._helpers import run_scene_pipeline, version_initial_scenes

router = APIRouter(prefix="/summary", tags=["summary"])

UPLOADS_DIR = "uploads"


def clear_temp_dirs():
    folders = ["images", "tmp", "tmp_audio", "tmp_preview_audio"]

    for folder in folders:
        if not os.path.isdir(folder):
            continue

        for f in os.listdir(folder):
            path = os.path.join(folder, f)

            if os.path.isfile(path):
                os.remove(path)


# ── POST /summary/generate ────────────────────────────────────────────────────


@router.post("/generate", response_model=SummaryResponse)
async def generate_summary(
    file: UploadFile = File(...),
    level_of_explanation: str = Form("basic"),
):
    """
    Upload a document file, parse it, and run summary_generation_agent.
    Stores document text + level in pipeline_state for subsequent /approve.
    Returns { summary, core_focus }.
    """
    from agents import summary_generation_agent
    from main import load_document

    os.makedirs(UPLOADS_DIR, exist_ok=True)
    dest = os.path.join(UPLOADS_DIR, file.filename)
    with open(dest, "wb") as out:
        shutil.copyfileobj(file.file, out)

    try:
        document_text = load_document(dest)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Document loading failed: {exc}")

    state = {
        "document": document_text,
        "summary": "",
        "core_focus": "",
        "summary_edit_request": None,
        "scenes": [],
        "images": {},
        "edit_request": "",
        "edit_scene_id": None,
        "level_of_explanation": level_of_explanation,
    }

    try:
        updated = summary_generation_agent(state)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Summary generation failed: {exc}")

    # Persist full state so /refine and /approve can reuse document text
    state_store.pipeline_state.clear()
    state_store.pipeline_state.update(updated)

    return SummaryResponse(
        summary=updated["summary"],
        core_focus=updated["core_focus"],
    )


# ── POST /summary/refine ──────────────────────────────────────────────────────


@router.post("/refine", response_model=SummaryResponse)
async def refine_summary(body: RefineSummaryRequest):
    """
    Run summary_edit_agent with a natural-language instruction.
    Returns updated { summary, core_focus }.
    """
    from agents import summary_edit_agent

    state = dict(state_store.pipeline_state)
    state["summary"] = body.summary
    state["core_focus"] = body.core_focus
    state["summary_edit_request"] = body.edit_request

    try:
        updated = summary_edit_agent(state)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Summary refinement failed: {exc}")

    state_store.pipeline_state.update(updated)

    return SummaryResponse(
        summary=updated["summary"],
        core_focus=updated["core_focus"],
    )


# ── POST /summary/approve ─────────────────────────────────────────────────────


@router.post("/approve", response_model=StartResponse)
async def approve_summary(body: ApproveSummaryRequest):
    """
    Accept the summary + core_focus and run the scene pipeline:
    scene_generation → grounding → image_generation.
    Returns the same shape as POST /pipeline/start.
    """
    from logger import clear_log

    clear_log()
    clear_temp_dirs()
    # Resolve document: use server-cached version if frontend sent empty string
    document = body.document or state_store.pipeline_state.get("document", "")
    level = body.level_of_explanation or state_store.pipeline_state.get(
        "level_of_explanation", "basic"
    )

    state_store.pipeline_state.clear()
    state_store.active_scene_versions.clear()
    state_store.scene_version_counter.clear()
    state_store.scene_version_data.clear()

    state_store.pipeline_state.update(
        {
            "document": document,
            "summary": body.summary,
            "core_focus": body.core_focus,
            "summary_edit_request": None,
            "scenes": [],
            "images": {},
            "edit_request": "",
            "edit_scene_id": None,
            "level_of_explanation": level,
        }
    )

    state = run_scene_pipeline(state_store.pipeline_state)
    state_store.pipeline_state.update(state)

    # Version the initial images
    version_initial_scenes(
        state_store.pipeline_state["scenes"],
        state_store.pipeline_state["images"],
    )

    scenes_out = [
        SceneOut(
            scene_id=s["scene_id"],
            title=s["title"],
            script=s["script"],
            visual_description=s["visual_description"],
            duration=s["duration"],
            image=state_store.pipeline_state["images"].get(s["scene_id"]),
        )
        for s in state_store.pipeline_state["scenes"]
    ]

    return StartResponse(
        scenes=scenes_out,
        images={str(k): v for k, v in state_store.pipeline_state["images"].items()},
    )
