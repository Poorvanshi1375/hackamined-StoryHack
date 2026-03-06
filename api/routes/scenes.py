import os
import glob

from fastapi import APIRouter, HTTPException

from api.models import (
    EditRequest,
    SceneOut,
    SetVersionRequest,
    SceneVersionsResponse,
    SceneStateResponse,
    SceneVersionContent,
)
from api import state_store

router = APIRouter(prefix="/scenes", tags=["scenes"])


# ── helpers ───────────────────────────────────────────────────────────────────


def _versioned_image_path(scene_id: int, version: int) -> str:
    return f"images/scene_{scene_id}_v{version}.png"


def _available_versions(scene_id: int) -> list[int]:
    """Scan the images/ folder for all versions of a scene."""
    pattern = f"images/scene_{scene_id}_v*.png"
    files = glob.glob(pattern)
    versions = []
    for f in files:
        # Extract version number from filename like "images/scene_1_v2.png"
        try:
            vnum = int(f.split("_v")[-1].replace(".png", ""))
            versions.append(vnum)
        except ValueError:
            pass
    return sorted(versions)


# ── GET /scenes/state ─────────────────────────────────────────────────────────
# Must be registered BEFORE /{scene_id} routes so FastAPI doesn't treat
# "state" as a scene_id parameter.


@router.get("/state", response_model=SceneStateResponse)
async def get_scene_state():
    """Return the active version for every scene currently in memory."""
    return SceneStateResponse(
        versions={str(k): v for k, v in state_store.active_scene_versions.items()}
    )


# ── GET /scenes/{scene_id}/versions ──────────────────────────────────────────


@router.get("/{scene_id}/versions", response_model=SceneVersionsResponse)
async def get_scene_versions(scene_id: int):
    """Return all generated image versions for a scene, the active one, and per-version scene content."""
    versions = _available_versions(scene_id)
    if not versions:
        raise HTTPException(
            status_code=404, detail=f"No versions found for Scene {scene_id}."
        )

    active = state_store.active_scene_versions.get(scene_id, versions[0])

    # Build version_data from in-memory store
    raw = state_store.scene_version_data.get(scene_id, {})
    version_data = {
        str(v): SceneVersionContent(
            title=raw[v]["title"],
            script=raw[v]["script"],
            visual_description=raw[v]["visual_description"],
            duration=raw[v]["duration"],
        )
        for v in versions
        if v in raw
    }

    return SceneVersionsResponse(
        scene_id=scene_id,
        available_versions=versions,
        active_version=active,
        version_data=version_data,
    )


# ── POST /scenes/{scene_id}/set-version ──────────────────────────────────────


@router.post("/{scene_id}/set-version")
async def set_scene_version(scene_id: int, body: SetVersionRequest):
    """Switch the active version for a scene (in memory only)."""
    img_path = _versioned_image_path(scene_id, body.version)
    if not os.path.isfile(img_path):
        raise HTTPException(
            status_code=404,
            detail=f"Version {body.version} image not found for Scene {scene_id}: {img_path}",
        )

    state_store.active_scene_versions[scene_id] = body.version

    # Update the in-memory pipeline state so storyboard reads show the right image
    if state_store.pipeline_state:
        state_store.pipeline_state["images"][scene_id] = img_path

    print(f"[API] Scene {scene_id} active version → v{body.version}")
    return {"scene_id": scene_id, "active_version": body.version}


# ── POST /scenes/{scene_id}/edit ──────────────────────────────────────────────


@router.post("/{scene_id}/edit", response_model=SceneOut)
async def edit_scene(scene_id: int, body: EditRequest):
    """
    Edit a single scene. edit_agent regenerates image as images/scene_N.png;
    we immediately rename it to the next versioned filename and update state.
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

    state_store.pipeline_state["edit_scene_id"] = scene_id
    state_store.pipeline_state["edit_request"] = body.edit_request

    try:
        updated_state = edit_agent(state_store.pipeline_state)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Edit agent error: {exc}")

    state_store.pipeline_state.update(updated_state)

    # ── Version the newly generated image ─────────────────────────────────
    # edit_agent saves to "images/scene_N.png"; rename to versioned filename
    raw_path = f"images/scene_{scene_id}.png"
    new_version = state_store.scene_version_counter.get(scene_id, 1) + 1
    new_path = _versioned_image_path(scene_id, new_version)

    if os.path.isfile(raw_path):
        os.rename(raw_path, new_path)
        print(f"[API] Scene {scene_id} image → {new_path} (v{new_version})")
    else:
        # If the agent wrote directly to a versioned path, keep as-is
        new_path = state_store.pipeline_state["images"].get(scene_id, new_path)

    state_store.scene_version_counter[scene_id] = new_version
    state_store.active_scene_versions[scene_id] = new_version
    state_store.pipeline_state["images"][scene_id] = new_path

    # ── Return the updated scene ───────────────────────────────────────────
    updated_scene = next(
        (s for s in state_store.pipeline_state["scenes"] if s["scene_id"] == scene_id),
        None,
    )
    if updated_scene is None:
        raise HTTPException(status_code=500, detail="Scene missing after edit.")

    # Store this version's content (must come after updated_scene is fetched)
    state_store.scene_version_data.setdefault(scene_id, {})[new_version] = {
        "title": updated_scene["title"],
        "script": updated_scene["script"],
        "visual_description": updated_scene["visual_description"],
        "duration": updated_scene["duration"],
    }

    return SceneOut(
        scene_id=updated_scene["scene_id"],
        title=updated_scene["title"],
        script=updated_scene["script"],
        visual_description=updated_scene["visual_description"],
        duration=updated_scene["duration"],
        image=new_path,
    )
