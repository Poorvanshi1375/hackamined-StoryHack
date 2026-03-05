import pyttsx3
import tempfile
import os
import subprocess
import wave

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TMP_DIR = tempfile.gettempdir()

scenes = [
    {"filename": "image_1.png", "duration": 5, "speech": "first scene"},
    {"filename": "image_2.png", "duration": 6, "speech": "second scene"},
    {"filename": "image_3.png", "duration": 4, "speech": "third scene"}
]

engine = pyttsx3.init()
engine.setProperty("rate", 170)

inputs = []
filters = []

for i, scene in enumerate(scenes):

    audio_path = os.path.join(TMP_DIR, f"scene_{i}.wav")
    image_path = os.path.join(BASE_DIR, "images", scene["filename"])

    engine.save_to_file(scene["speech"], audio_path)
    engine.runAndWait()

    with wave.open(audio_path) as w:
        audio_duration = w.getnframes() / w.getframerate()

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