import os
import sys
from pathlib import Path
from langgraph.graph import StateGraph, END
from state import VideoState
from logger import clear_log
from agents import (
    scene_generation_agent,
    grounding_agent,
    image_generation_agent,
    hitl_agent,
    edit_agent
)


# Fix #9: Routing function for the HITL conditional edge.
# If the user requested an edit, go to edit_scene; otherwise finish.
def should_edit(state: VideoState) -> str:
    if state.get("edit_scene_id") is not None:
        return "edit_scene"
    return END


builder = StateGraph(VideoState)

builder.add_node("scene_generation", scene_generation_agent)
builder.add_node("grounding", grounding_agent)
builder.add_node("image_generation", image_generation_agent)
builder.add_node("hitl", hitl_agent)
builder.add_node("edit_scene", edit_agent)

builder.set_entry_point("scene_generation")

builder.add_edge("scene_generation", "grounding")
builder.add_edge("grounding", "image_generation")
builder.add_edge("image_generation", "hitl")

# Fix #9: Replace the static hitl → edit_scene edge with a conditional one.
# Routes to edit_scene if the user picked a scene to edit, or END if approved.
builder.add_conditional_edges(
    "hitl",
    should_edit,
    {
        "edit_scene": "edit_scene",
        END: END,
    }
)

# Fix #9: After editing, loop back to hitl so the user can review the change
# and keep editing or approve the full storyboard.
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
        raise ValueError(f"Unsupported file type: '{ext}'. Supported: txt, pdf, ppt, pptx, doc, docx")

    pages = loader.load()
    return "\n\n".join(p.page_content for p in pages)


if __name__ == "__main__":
    clear_log()  # Wipe the log so each run starts fresh

    level_of_explanation = "basic"  # can be "basic", "detailed", or "expert"

    INPUT_FILE = "dp_data_localization.pptx"  # ← change this to your file (pdf, pptx, docx, txt)

    print(f"Loading document: {INPUT_FILE}")
    doc = load_document(INPUT_FILE)

    state = {
        "document": doc,
        "summary": "",
        "scenes": [],
        "images": {},
        "edit_request": "",
        "edit_scene_id": None,
        "level_of_explanation": level_of_explanation,  # flows into scene_generation prompt
    }

    result = graph.invoke(state)

    print("\nPipeline complete. All scenes approved.")
    print(f"Total scenes: {len(result['scenes'])}")
    print(f"Images saved: {list(result['images'].values())}")