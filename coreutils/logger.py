from datetime import datetime

LOG_FILE = "storyboard_log.txt"


def clear_log() -> None:
    """Wipe the log file at the start of a new run."""
    with open(LOG_FILE, "w", encoding="utf-8") as f:
        f.write("")
    print(f"[logger] {LOG_FILE} cleared for new run.")


def _get_next_version() -> int:
    """Count existing version headers in the log file to determine next version number."""
    try:
        with open(LOG_FILE, "r", encoding="utf-8") as f:
            content = f.read()
        return content.count("=== Version ") + 1
    except FileNotFoundError:
        return 1


def log_storyboard_version(state: dict, label: str = "") -> None:
    """Append a versioned snapshot of the current storyboard to the log file.

    Parameters
    ----------
    state : dict  The current VideoState dictionary.
    label : str   Optional label e.g. "Initial Generation" or "Edit: Scene 2".
    """
    version = _get_next_version()
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    lines = []
    lines.append(f"=== Version {version} — {timestamp}{' | ' + label if label else ''} ===\n")

    scenes = state.get("scenes", [])
    images = state.get("images", {})

    for scene in scenes:
        sid = scene.get("scene_id", "?")
        lines.append(f"  Scene {sid}: {scene.get('title', 'Untitled')}")
        lines.append(f"    Duration : {scene.get('duration', '?')}s")
        lines.append(f"    Script   : {scene.get('script', '')}")
        lines.append(f"    Visual   : {scene.get('visual_description', '')}")
        lines.append(f"    Image    : {images.get(sid, 'N/A')}")
        lines.append("")

    lines.append("-" * 60 + "\n")

    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"[logger] Storyboard v{version} saved to {LOG_FILE}")
