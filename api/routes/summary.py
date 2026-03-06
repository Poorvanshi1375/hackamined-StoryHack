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

router = APIRouter(prefix="/summary", tags=["summary"])

UPLOADS_DIR = "uploads"


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
    from agents import scene_generation_agent, grounding_agent, image_generation_agent
    from logger import clear_log

    clear_log()
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

    try:
        state = scene_generation_agent(state_store.pipeline_state)
        state = grounding_agent(state)
        state = image_generation_agent(state)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Pipeline error: {exc}")

    state_store.pipeline_state.update(state)

    # Version the initial images (same logic as /pipeline/start)
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
        state_store.scene_version_data.setdefault(sid, {})[1] = {
            "title": scene["title"],
            "script": scene["script"],
            "visual_description": scene["visual_description"],
            "duration": scene["duration"],
        }

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
