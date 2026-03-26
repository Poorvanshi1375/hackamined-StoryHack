"""
api/routes/_helpers.py
----------------------
Shared helpers used by multiple route modules to avoid duplication.
"""

import os
from fastapi import HTTPException
from api import state_store


def run_scene_pipeline(state: dict) -> dict:
    """
    Run the three core pipeline steps — scene generation, grounding, and image
    generation — on *state* and return the updated state.

    Raises HTTPException(500) on any agent failure.
    """
    from agents import scene_generation_agent, grounding_agent, image_generation_agent

    try:
        state = scene_generation_agent(state)
        print("[API] Scenes generated")

        state = grounding_agent(state)
        print("[API] Scenes grounded")

        state = image_generation_agent(state)
        print("[API] Images generated")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Pipeline error: {exc}")

    return state


def version_initial_scenes(scenes: list, images: dict) -> None:
    """
    Rename the raw generated images to versioned filenames (scene_N_v1.png),
    update state_store.pipeline_state, and initialise all per-scene version
    tracking dictionaries for the supplied scenes.
    """
    for scene in scenes:
        sid = scene["scene_id"]
        raw_path = images.get(sid, f"images/scene_{sid}.png")
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
        print(f"[API] Scene {sid} → {v1_path} (v1)")
