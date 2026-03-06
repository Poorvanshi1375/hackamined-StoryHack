"""
video_gen.py
------------
Generates a final MP4 video from scenes defined in storyboard_log.json.

For each scene:
 1. A gTTS voiceover is generated from the scene's script.
 2. The scene's image is displayed as a still-image clip for the duration
    of the voiceover audio.
 3. All scene clips are concatenated into one final video file.

Requirements:
    pip install gtts moviepy pillow
"""

import os
import json
from gtts import gTTS
try:
    # moviepy v2.x
    from moviepy import ImageClip, AudioFileClip, concatenate_videoclips
except ImportError:
    # moviepy v1.x
    from moviepy.editor import ImageClip, AudioFileClip, concatenate_videoclips


# ── helpers ──────────────────────────────────────────────────────────────────

def _make_audio(text: str, path: str) -> float:
    """Synthesise speech with gTTS, save to *path*, return duration (s)."""
    tts = gTTS(text=text, lang="en", slow=False)
    tts.save(path)
    # Measure duration via moviepy (no extra dep needed)
    clip = AudioFileClip(path)
    duration = clip.duration
    clip.close()
    return duration


def _build_scene_clip(image_path: str, audio_path: str, duration: float):
    """Return a video clip: still image for *duration* seconds + audio."""
    audio = AudioFileClip(audio_path)
    video = ImageClip(image_path, duration=duration)
    # moviepy v2.x uses with_* instead of set_*
    try:
        video = video.with_audio(audio).with_fps(24)
    except AttributeError:
        # moviepy v1.x fallback
        video = video.set_audio(audio).set_fps(24)
    return video


# ── public entry point ────────────────────────────────────────────────────────

def generate_video(
    storyboard_json_path: str = "storyboard_log.json",
    output_path: str = "output_video.mp4",
    tmp_dir: str = "tmp_audio",
) -> str:
    """
    Read the *latest* storyboard version from *storyboard_json_path*, generate
    a voiceover for each scene, and concatenate everything into *output_path*.

    Returns the absolute path to the produced video file.
    """

    # ── Load storyboard ───────────────────────────────────────────────────────
    with open(storyboard_json_path, encoding="utf-8") as f:
        versions = json.load(f)

    # The JSON is a list of versions; take the latest entry
    latest = versions[-1]
    scenes = latest["scenes"]

    if not scenes:
        raise ValueError("No scenes found in storyboard — nothing to render.")

    print(f"\n[VideoGen] Found {len(scenes)} scene(s). Starting render…\n")

    # ── Temporary folder for audio files ─────────────────────────────────────
    os.makedirs(tmp_dir, exist_ok=True)

    clips = []

    for scene in scenes:
        scene_id   = scene["scene_id"]
        script     = scene["script"]
        image_path = scene["image"]  # e.g. "images/scene_1.png"

        if not os.path.isfile(image_path):
            raise FileNotFoundError(
                f"Image not found for Scene {scene_id}: {image_path}"
            )

        print(f"  Scene {scene_id} — synthesising voiceover…")
        audio_path = os.path.join(tmp_dir, f"scene_{scene_id}.mp3")
        duration   = _make_audio(script, audio_path)
        print(f"  Scene {scene_id} — audio duration: {duration:.1f}s")

        print(f"  Scene {scene_id} — building clip from {image_path}…")
        clip = _build_scene_clip(image_path, audio_path, duration)
        clips.append(clip)
        print(f"  Scene {scene_id} — clip ready.\n")

    # ── Concatenate all clips ─────────────────────────────────────────────────
    print("[VideoGen] Concatenating clips…")
    final = concatenate_videoclips(clips, method="compose")

    print(f"[VideoGen] Writing video → {output_path}")
    final.write_videofile(
        output_path,
        codec="libx264",
        audio_codec="aac",
        temp_audiofile="tmp_final_audio.m4a",
        remove_temp=True,
        logger=None,        # suppress moviepy's verbose progress bar
    )

    # ── Cleanup ───────────────────────────────────────────────────────────────
    for clip in clips:
        clip.close()
    final.close()

    abs_path = os.path.abspath(output_path)
    print(f"\n[VideoGen] ✅ Done!  Video saved to: {abs_path}\n")
    return abs_path
