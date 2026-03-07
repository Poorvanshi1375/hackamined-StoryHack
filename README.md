# StoryHack — AI Video Storyboard Generator

Turn any document into a narrated explainer video in minutes. Upload a PDF, PPTX, DOCX, or TXT file; an LLM pipeline breaks it into scenes, generates images, synthesises narration audio, and stitches everything into an MP4.

---

## How It Works

```
Document Upload
      │
      ▼
 Summary Generation  ──► Human Review & Refinement (HITL)
      │
      ▼
 Scene Generation ──► Grounding / Fact-check
      │
      ▼
 Image Generation (per scene)
      │
      ▼
 Storyboard HITL  ──► Scene-level edits, voice selection, version switching
      │
      ▼
 TTS Audio Synthesis (edge-tts, per scene)
      │
      ▼
 Video Render (FFmpeg — image + audio per scene → MP4)
      │
      ▼
 Video Preview & Download
```

### Stage-by-Stage Details

| Stage                | What Happens                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Upload**           | Document parsed to plain text (`PyMuPDF`, `python-pptx`, `python-docx`)                                      |
| **Summary**          | LLM generates a `summary` + `core_focus`; user can refine with natural-language instructions                 |
| **Scene Generation** | LLM breaks content into `N` scenes (title, script, visual description, duration)                             |
| **Grounding**        | Second LLM pass fact-checks and grounds each scene against the source document                               |
| **Image Generation** | Visual description sent to a text-to-image model (RunPod inference endpoint); images saved as versioned PNGs |
| **Scene HITL**       | User can edit any scene, switch image version, select voice, preview audio, include/exclude scenes           |
| **Video Render**     | `video_gen.py` assembles selected scenes: TTS audio → FFmpeg image+audio clip → concat final MP4             |

---

## Architecture

```
hackamined-StoryHack/
├── api/                        # FastAPI layer
│   ├── main.py                 # App bootstrap, CORS, static file mount
│   ├── models.py               # Pydantic request/response models
│   ├── state_store.py          # In-memory pipeline state (scenes, versions, voices)
│   └── routes/
│       ├── pipeline.py         # /pipeline/start  /pipeline/storyboard  /pipeline/approve
│       ├── scenes.py           # /scenes/{id}/edit  /versions  /set-version  /voice  /preview-audio
│       ├── summary.py          # /summary/generate  /summary/refine  /summary/approve
│       └── video.py            # /video  (stream MP4)
│
├── coreutils/                  # Core AI pipeline (runs from coreutils/ as CWD)
│   ├── agents.py               # LLM agent functions (summary, scene gen, grounding, edit)
│   ├── prompts.py              # All LLM prompt templates
│   ├── schemas.py              # Pydantic output schemas (SceneList, SceneEdit, SummarySchema)
│   ├── image_gen.py            # Image generation via RunPod / HF API
│   ├── tts.py                  # TTS via edge-tts (Microsoft Azure neural voices)
│   ├── video_gen.py            # FFmpeg video assembly
│   ├── logger.py               # Storyboard version logging → storyboard_log.json
│   ├── state.py                # TypedDict for pipeline state
│   ├── main.py                 # Document loader (PDF / PPTX / DOCX / TXT)
│   ├── images/                 # Generated scene images (scene_{id}_v{n}.png)
│   ├── tmp_audio/              # Per-scene audio clips
│   └── output_video.mp4        # Final rendered video
│
├── storyhack-ui/               # React + Vite frontend
│   ├── index.html              # Tailwind CDN, Inter font
│   └── src/
│       ├── App.jsx             # Root — stage machine, global state
│       ├── api.js              # All fetch calls to FastAPI
│       └── components/
│           ├── Stepper.jsx     # Horizontal step progress bar
│           ├── UploadPanel.jsx # File upload + style selection
│           ├── SummaryReview.jsx  # Summary & core-focus HITL
│           ├── StoryboardView.jsx # 3-column Canva-style editor + thumbnail sidebar
│           ├── SceneCard.jsx   # Scene image, controls, voice, edit prompt
│           └── VideoPanel.jsx  # Final video player + download
│
├── .env                        # API keys (see below)
└── README.md
```

---

## Tech Stack

| Layer                | Technology                                           |
| -------------------- | ---------------------------------------------------- |
| **LLM**              | Groq (OpenAI-compatible API) — `openai/gpt-oss-120b` |
| **Image Generation** | RunPod serverless inference endpoint                 |
| **TTS**              | Microsoft Edge TTS via `edge-tts`                    |
| **Video Assembly**   | FFmpeg                                               |
| **Backend**          | FastAPI + Uvicorn                                    |
| **Frontend**         | React 18 + Vite + Tailwind CSS (CDN)                 |
| **LLM Framework**    | LangChain (`langchain-groq`)                         |

---

## Prerequisites

- Python 3.10+
- Node.js 18+
- `ffmpeg` installed and on your `PATH`
- API keys for Groq, Hugging Face, and RunPod

---

## Running Locally

### 1. Clone and configure

```bash
git clone <repo-url>
cd hackamined-StoryHack
```

Create a `.env` file in the project root:

```env
GROQ_API_KEY=your_groq_api_key
HF_API_KEY=your_huggingface_api_key
RUNPOD_API_KEY=your_runpod_api_key
```

### 2. Install Python dependencies

```bash
pip install fastapi uvicorn langchain langchain-groq pydantic \
            python-multipart pymupdf python-pptx python-docx \
            edge-tts pillow requests
```

### 3. Start the backend

```bash
# From the project root
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

### 4. Start the frontend

```bash
cd storyhack-ui
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## API Endpoints (Summary)

| Method | Endpoint                     | Description                                      |
| ------ | ---------------------------- | ------------------------------------------------ |
| `POST` | `/summary/generate`          | Upload doc → generate summary & core focus       |
| `POST` | `/summary/refine`            | Refine summary with natural-language instruction |
| `POST` | `/summary/approve`           | Approve summary → trigger scene + image pipeline |
| `GET`  | `/pipeline/storyboard`       | Fetch latest storyboard from log                 |
| `POST` | `/pipeline/approve`          | Render final video from selected scenes          |
| `POST` | `/scenes/{id}/edit`          | Edit a specific scene (reruns image gen)         |
| `GET`  | `/scenes/{id}/versions`      | Get available image versions for a scene         |
| `POST` | `/scenes/{id}/set-version`   | Switch active image version                      |
| `POST` | `/scenes/{id}/voice`         | Set TTS voice for a scene                        |
| `GET`  | `/scenes/{id}/preview-audio` | Stream audio preview for a scene                 |
| `GET`  | `/video`                     | Stream the rendered MP4                          |
| `GET`  | `/voices`                    | List supported TTS voices                        |
| `GET`  | `/images/{filename}`         | Serve generated scene images (static)            |
