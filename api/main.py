"""
api/main.py
-----------
FastAPI entry point for the StoryHack AI video pipeline.

IMPORTANT — Path Strategy:
  The entire coreutils pipeline resolves files using relative paths
  (storyboard_log.json, images/, tmp_audio/, output_video.mp4).
  We must chdir into coreutils/ before importing any coreutils module so that
  every relative open() / FileNotFoundError inside the pipeline points to the
  right place.  sys.path is also pre-pended so bare `from agents import ...`
  style imports resolve correctly.

Usage:
  # from the project root
  uvicorn api.main:app --reload --port 8000
"""

import os
import sys
from pathlib import Path

# ── 1. Fix CWD and sys.path BEFORE any coreutils import ─────────────────────
COREUTILS_DIR = str(Path(__file__).resolve().parent.parent / "coreutils")
os.chdir(COREUTILS_DIR)
if COREUTILS_DIR not in sys.path:
    sys.path.insert(0, COREUTILS_DIR)

# ── 2. FastAPI plumbing ──────────────────────────────────────────────────────
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api.routes import pipeline, scenes, video, summary

app = FastAPI(
    title="StoryHack API",
    description="Thin HTTP wrapper over the AI video pipeline.",
    version="1.0.0",
)

# CORS — open for hackathon; restrict to your React origin in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 3. Static files ──────────────────────────────────────────────────────────
# Serve generated images so the frontend can <img src="/images/scene_1.png">
images_dir = os.path.join(COREUTILS_DIR, "images")
os.makedirs(images_dir, exist_ok=True)
app.mount("/images", StaticFiles(directory=images_dir), name="images")

# ── 4. Routers ───────────────────────────────────────────────────────────────
app.include_router(pipeline.router)
app.include_router(scenes.router)
app.include_router(video.router)
app.include_router(summary.router)


# ── 5. Root health check ─────────────────────────────────────────────────────
@app.get("/", tags=["health"])
async def root():
    return {"status": "ok", "message": "StoryHack API is running"}


# ── 6. Startup log ───────────────────────────────────────────────────────────
@app.on_event("startup")
async def on_startup():
    print(f"[API] Server ready — CWD: {os.getcwd()}")
    print(
        f"[API] Endpoints: /pipeline/start, /pipeline/storyboard, /pipeline/approve, /scenes/{{id}}/edit, /video"
    )
