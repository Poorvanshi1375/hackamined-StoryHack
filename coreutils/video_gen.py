import os
import json
import subprocess
from tts import generate_tts_audio, DEFAULT_VOICE


def _run(cmd):
    subprocess.run(
        cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True
    )


def _speedup_audio(src, dst, speed=1.00):
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
    tmp_dir="tmp_audio",
    active_versions: dict = None,
    selected_scenes: list = None,
    scene_voices: dict = None,
    version_data: dict = None,
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

        # Resolve versioned image and script if active_versions is provided
        if active_versions and scene_id in active_versions:
            version = active_versions[scene_id]
            image = f"images/scene_{scene_id}_v{version}.png"
            print(f"Scene {scene_id} → using active version v{version}: {image}")

            found_script = False
            if (
                version_data
                and scene_id in version_data
                and version in version_data[scene_id]
            ):
                s_data = version_data[scene_id][version]
                if s_data and s_data.get("script"):
                    script = s_data["script"]
                    found_script = True

            if not found_script:
                target_log = next(
                    (v for v in versions if v.get("version") == version), None
                )
                if target_log:
                    s_data = next(
                        (
                            s
                            for s in target_log.get("scenes", [])
                            if s.get("scene_id") == scene_id
                        ),
                        None,
                    )
                    if s_data and s_data.get("script"):
                        script = s_data["script"]
        else:
            image = scene["image"]

        raw_audio = os.path.join(tmp_dir, f"scene_{scene_id}_raw.mp3")
        fast_audio = os.path.join(tmp_dir, f"scene_{scene_id}.mp3")
        clip_path = os.path.join(tmp_dir, f"clip_{scene_id}.mp4")

        voice = (
            scene_voices.get(scene_id, DEFAULT_VOICE) if scene_voices else DEFAULT_VOICE
        )
        print(f"Scene {scene_id} → generating speech ({voice})")
        generate_tts_audio(script, raw_audio, voice)

        print(f"Scene {scene_id} → speeding audio")
        _speedup_audio(raw_audio, fast_audio, 1.00)

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
