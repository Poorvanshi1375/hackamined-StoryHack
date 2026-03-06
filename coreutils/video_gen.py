import os
import json
import subprocess
from gtts import gTTS


def _run(cmd):
    subprocess.run(
        cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True
    )


def _make_audio(text: str, path: str):
    tts = gTTS(text=text, lang="en", slow=False)
    tts.save(path)


def _speedup_audio(src, dst, speed=1.25):
    _run(["ffmpeg", "-y", "-i", src, "-filter:a", f"atempo={speed}", dst])


def _get_audio_duration(path):
    result = subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            path,
        ]
    )
    return float(result.strip())


def _build_scene_clip(image, audio, duration, output):
    _run(
        [
            "ffmpeg",
            "-y",
            "-loop",
            "1",
            "-i",
            image,
            "-i",
            audio,
            "-c:v",
            "libx264",
            "-t",
            str(duration),
            "-pix_fmt",
            "yuv420p",
            "-vf",
            "fps=24",
            "-shortest",
            output,
        ]
    )


def generate_video(
    storyboard_json_path="storyboard_log.json",
    output_path="output_video.mp4",
    tmp_dir="tmp",
    active_versions: dict = None,
    selected_scenes: list = None,
):
    """
    active_versions: optional dict {scene_id: version_number}.
    When provided, image paths are resolved as images/scene_{id}_v{version}.png
    instead of using whatever path is stored in storyboard_log.json.

    selected_scenes: optional list of scene_id integers.
    If provided, only these scenes are rendered.
    """

    with open(storyboard_json_path, encoding="utf-8") as f:
        versions = json.load(f)

    latest = versions[-1]
    scenes = latest["scenes"]

    if selected_scenes is not None:
        scenes = [s for s in scenes if s["scene_id"] in selected_scenes]

    if not scenes:
        raise ValueError("No scenes found in storyboard.")

    os.makedirs(tmp_dir, exist_ok=True)

    clip_paths = []

    for scene in scenes:
        scene_id = scene["scene_id"]
        script = scene["script"]

        # Resolve versioned image path if active_versions is provided
        if active_versions and scene_id in active_versions:
            version = active_versions[scene_id]
            image = f"images/scene_{scene_id}_v{version}.png"
            print(f"Scene {scene_id} → using active version v{version}: {image}")
        else:
            image = scene["image"]

        raw_audio = os.path.join(tmp_dir, f"scene_{scene_id}_raw.mp3")
        fast_audio = os.path.join(tmp_dir, f"scene_{scene_id}.mp3")
        clip_path = os.path.join(tmp_dir, f"clip_{scene_id}.mp4")

        print(f"Scene {scene_id} → generating speech")
        _make_audio(script, raw_audio)

        print(f"Scene {scene_id} → speeding audio")
        _speedup_audio(raw_audio, fast_audio, 1.25)

        duration = _get_audio_duration(fast_audio)

        print(f"Scene {scene_id} → building clip")
        _build_scene_clip(image, fast_audio, duration, clip_path)

        clip_paths.append(clip_path)

    concat_file = os.path.join(tmp_dir, "concat.txt")

    with open(concat_file, "w") as f:
        for clip in clip_paths:
            f.write(f"file '{os.path.abspath(clip)}'\n")

    print("Concatenating clips")

    _run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            concat_file,
            "-c",
            "copy",
            output_path,
        ]
    )

    abs_path = os.path.abspath(output_path)
    print(f"\nVideo saved → {abs_path}\n")

    return abs_path
