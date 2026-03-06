from fastapi import APIRouter, HTTPException

from api.models import EditRequest, SceneOut
from api import state_store

router = APIRouter(prefix="/scenes", tags=["scenes"])


@router.post("/{scene_id}/edit", response_model=SceneOut)
async def edit_scene(scene_id: int, body: EditRequest):
    """
    Edit a single scene by scene_id.
    Calls the existing edit_agent which also regenerates the scene image
    and logs the new storyboard version internally.
    """
    from agents import edit_agent

    if not state_store.pipeline_state:
        raise HTTPException(
            status_code=400,
            detail="No active pipeline session. Run /pipeline/start first.",
        )

    scenes = state_store.pipeline_state.get("scenes", [])
    if not any(s["scene_id"] == scene_id for s in scenes):
        raise HTTPException(status_code=404, detail=f"Scene {scene_id} not found.")

    print(f"[API] Edit requested for Scene {scene_id}: {body.edit_request!r}")

    # Set edit parameters on global state
    state_store.pipeline_state["edit_scene_id"] = scene_id
    state_store.pipeline_state["edit_request"] = body.edit_request

    try:
        updated_state = edit_agent(state_store.pipeline_state)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Edit agent error: {exc}")

    state_store.pipeline_state.update(updated_state)

    # Note: edit_agent already calls log_storyboard_version internally — no duplicate needed

    # Return the updated scene
    updated_scene = next(
        (s for s in state_store.pipeline_state["scenes"] if s["scene_id"] == scene_id),
        None,
    )
    if updated_scene is None:
        raise HTTPException(status_code=500, detail="Scene missing after edit.")

    return SceneOut(
        scene_id=updated_scene["scene_id"],
        title=updated_scene["title"],
        script=updated_scene["script"],
        visual_description=updated_scene["visual_description"],
        duration=updated_scene["duration"],
        image=state_store.pipeline_state["images"].get(scene_id),
    )
