import tempfile
import os
import subprocess
from gtts import gTTS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TMP_DIR = tempfile.gettempdir()

scenes = [
    {"filename": "image_1.png", "duration": 5, "speech": "first scene"},
    {"filename": "image_2.png", "duration": 6, "speech": "second scene"},
    {"filename": "image_3.png", "duration": 4, "speech": "third scene"}
]

inputs = []
filters = []

for i, scene in enumerate(scenes):

    audio_path = os.path.join(TMP_DIR, f"scene_{i}.mp3")
    image_path = os.path.join(BASE_DIR, "images", scene["filename"])

    tts = gTTS(scene["speech"], lang="en")
    tts.save(audio_path)

    result = subprocess.run(
        [
            "ffprobe",
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            audio_path
        ],
        capture_output=True,
        text=True
    )

    audio_duration = float(result.stdout.strip())

    duration = max(scene["duration"], audio_duration)

    inputs.extend([
        "-loop", "1", "-t", str(duration), "-i", image_path,
        "-i", audio_path
    ])

    filters.append(f"[{2*i}:v][{2*i+1}:a]")

filter_complex = "".join(filters) + f"concat=n={len(scenes)}:v=1:a=1[v][a]"

cmd = [
    "ffmpeg",
    "-y",
    *inputs,
    "-filter_complex", filter_complex,
    "-map", "[v]",
    "-map", "[a]",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "output.mp4"
]

subprocess.run(cmd)