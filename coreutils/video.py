import tempfile
import os
import subprocess
from gtts import gTTS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TMP_DIR = tempfile.gettempdir()

SPEED = 1.25

scenes = [
    {
        "filename": "scene_1.png",
        "speech": "The narrator introduces solar power as a clean, renewable solution, then outlines the main hurdles: high upfront costs for panels, inverters and storage; the intermittent nature of sunlight causing night‑time and cloudy‑day gaps; the large land footprint of utility farms that can clash with agriculture and ecosystems; relatively low conversion efficiency of traditional panels; environmental impacts from manufacturing chemicals and energy use; end‑of‑life waste without proper recycling; grid stability issues from fluctuating output; and limited public awareness and technical knowledge."
    },
    {
        "filename": "scene_2.png",
        "speech": "The narrator shifts to the solutions: government subsidies, tax credits and leasing models lower costs; lithium‑ion batteries, hybrid solar‑wind systems and smart‑grid tech smooth out intermittency; rooftop, floating and agrivoltaic installations reduce land conflicts; perovskite and multi‑junction cells boost efficiency; greener manufacturing, recycling programs and recyclable designs cut environmental footprints; AI‑driven forecasting and microgrids stabilize the grid; education campaigns and easy financing raise awareness. The segment ends with a hopeful vision of clean, affordable energy powering homes, farms and cities worldwide."
    }
]

inputs = []
filters = []

for i, scene in enumerate(scenes):

    audio_path = os.path.join(TMP_DIR, f"scene_{i}.mp3")
    sped_audio = os.path.join(TMP_DIR, f"scene_{i}_fast.mp3")

    image_path = os.path.join(BASE_DIR, "images", scene["filename"])

    tts = gTTS(scene["speech"], lang="en", tld="co.in")
    tts.save(audio_path)

    subprocess.run([
        "ffmpeg",
        "-y",
        "-i", audio_path,
        "-filter:a", f"atempo={SPEED}",
        sped_audio
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    result = subprocess.run(
        [
            "ffprobe",
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            sped_audio
        ],
        capture_output=True,
        text=True
    )

    duration = float(result.stdout.strip())

    inputs.extend([
        "-loop", "1",
        "-t", str(duration),
        "-i", image_path,
        "-i", sped_audio
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