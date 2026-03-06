import os
import sys
from pathlib import Path
from langgraph.graph import StateGraph, END
from state import VideoState
from logger import clear_log
from agents import (
    summary_generation_agent,
    summary_hitl_agent,
    summary_edit_agent,
    scene_generation_agent,
    grounding_agent,
    image_generation_agent,
    hitl_agent,
    edit_agent,
)


# ── Routing functions ─────────────────────────────────────────────────────────


def should_edit_summary(state: VideoState) -> str:
    """Route to summary_edit if the user requested a refinement, else continue to scene_generation."""
    if state.get("summary_edit_request"):
        return "summary_edit"
    return "scene_generation"


def should_edit(state: VideoState) -> str:
    """Route to edit_scene if the user picked a scene to edit, or END if approved."""
    if state.get("edit_scene_id") is not None:
        return "edit_scene"
    return END


# ── Graph definition ──────────────────────────────────────────────────────────

builder = StateGraph(VideoState)

# Summary stage nodes
builder.add_node("summary_generation", summary_generation_agent)
builder.add_node("summary_hitl", summary_hitl_agent)
builder.add_node("summary_edit", summary_edit_agent)

# Existing pipeline nodes
builder.add_node("scene_generation", scene_generation_agent)
builder.add_node("grounding", grounding_agent)
builder.add_node("image_generation", image_generation_agent)
builder.add_node("hitl", hitl_agent)
builder.add_node("edit_scene", edit_agent)

# Entry point — now starts with summary stage
builder.set_entry_point("summary_generation")

# Summary stage edges
builder.add_edge("summary_generation", "summary_hitl")
builder.add_conditional_edges(
    "summary_hitl",
    should_edit_summary,
    {
        "summary_edit": "summary_edit",
        "scene_generation": "scene_generation",
    },
)
# Refinement loop: after editing, return to HITL for re-review
builder.add_edge("summary_edit", "summary_hitl")

# Existing pipeline edges (unchanged)
builder.add_edge("scene_generation", "grounding")
builder.add_edge("grounding", "image_generation")
builder.add_edge("image_generation", "hitl")

builder.add_conditional_edges(
    "hitl",
    should_edit,
    {
        "edit_scene": "edit_scene",
        END: END,
    },
)
builder.add_edge("edit_scene", "hitl")

graph = builder.compile()


def load_document(file_path: str) -> str:
    """Load a .txt, .pdf, .ppt/.pptx, or .doc/.docx file and return its text."""
    ext = Path(file_path).suffix.lower()

    if ext == ".txt":
        from langchain_community.document_loaders import TextLoader

        loader = TextLoader(file_path, encoding="utf-8")

    elif ext == ".pdf":
        from langchain_community.document_loaders import PyPDFLoader

        loader = PyPDFLoader(file_path)

    elif ext in (".ppt", ".pptx"):
        from langchain_community.document_loaders import UnstructuredPowerPointLoader

        loader = UnstructuredPowerPointLoader(file_path)

    elif ext in (".doc", ".docx"):
        from langchain_community.document_loaders import UnstructuredWordDocumentLoader

        loader = UnstructuredWordDocumentLoader(file_path)

    else:
        raise ValueError(
            f"Unsupported file type: '{ext}'. Supported: txt, pdf, ppt, pptx, doc, docx"
        )

    pages = loader.load()
    return "\n\n".join(p.page_content for p in pages)


if __name__ == "__main__":
    clear_log()  # Wipe the log so each run starts fresh

    level_of_explanation = "basic"  # can be "basic", "detailed", or "expert"

    INPUT_FILE = (
        "dp_data_localization.pptx"  # ← change this to your file (pdf, pptx, docx, txt)
    )

    print(f"Loading document: {INPUT_FILE}")
    doc = load_document(INPUT_FILE)

    state = {
        "document": doc,
        "summary": "",
        "core_focus": "",
        "summary_edit_request": None,
        "scenes": [],
        "images": {},
        "edit_request": "",
        "edit_scene_id": None,
        "level_of_explanation": level_of_explanation,
    }

    result = graph.invoke(state)

    print("\nPipeline complete. All scenes approved.")
    print(f"Total scenes: {len(result['scenes'])}")
    print(f"Images saved: {list(result['images'].values())}")
