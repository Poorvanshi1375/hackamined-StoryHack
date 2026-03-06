import json
from datetime import datetime

LOG_FILE = "storyboard_log.json"


def clear_log() -> None:
    """Reset the JSON log file to an empty array at the start of a new run."""
    with open(LOG_FILE, "w", encoding="utf-8") as f:
        json.dump([], f)
    print(f"[logger] {LOG_FILE} cleared for new run.")




def log_storyboard_version(state: dict, label: str = "") -> None:
    """Append a versioned JSON snapshot of the current storyboard to the log file.

    Parameters
    ----------
    state : dict  The current VideoState dictionary.
    label : str   Optional label e.g. "Initial Generation" or "Edit: Scene 2".
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    scenes = state.get("scenes", [])
    images = state.get("images", {})

    # Load existing entries first — version is derived from this same list
    try:
        with open(LOG_FILE, "r", encoding="utf-8") as f:
            entries = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        entries = []

    version = len(entries) + 1  # single source of truth, no drift possible

    entry = {
        "version": version,
        "timestamp": timestamp,
        "label": label,
        "scenes": [
            {
                "scene_id": scene.get("scene_id", "?"),
                "title": scene.get("title", "Untitled"),
                "duration": scene.get("duration", "?"),
                "script": scene.get("script", ""),
                "visual_description": scene.get("visual_description", ""),
                "image": images.get(scene.get("scene_id"), "N/A"),
            }
            for scene in scenes
        ],
    }

    entries.append(entry)

    with open(LOG_FILE, "w", encoding="utf-8") as f:
        json.dump(entries, f, indent=2, ensure_ascii=False)

    print(f"[logger] Storyboard v{version} saved to {LOG_FILE}")
