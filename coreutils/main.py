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

    if state.get("generate_video"):
        return "generate_video"

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


if __name__ == "__main__":
    clear_log()  # Wipe the log so each run starts fresh
    doc = open("paper.txt", encoding="utf-8").read()

    state = {
        "document": doc,
        "summary": "",
        "scenes": [],
        "images": {},
        "edit_request": "",
        "edit_scene_id": None,  # Fix #10: must be None at start, not missing
    }

    result = graph.invoke(state)

    print("\nPipeline complete. All scenes approved.")
    print(f"Total scenes: {len(result['scenes'])}")
    print(f"Images saved: {list(result['images'].values())}")