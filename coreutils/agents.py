import json
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from state import VideoState
from prompts import (
    SUMMARY_GENERATION_PROMPT,
    SUMMARY_EDIT_PROMPT,
    SCENE_GENERATION_PROMPT,
    GROUNDING_PROMPT,
    EDIT_PROMPT,
)
from image_gen import generate_image
from schemas import SceneList, SceneEdit, SummarySchema
from logger import log_storyboard_version
from video_gen import generate_video

llm = ChatGroq(
    model="openai/gpt-oss-120b",  # VALID GROQ MODELS: llama3-70b-8192, llama3-8b-8192, mixtral-8x7b-32768
    temperature=0.3,
)


# ── Summary stage ─────────────────────────────────────────────────────────────


def summary_generation_agent(state: VideoState) -> VideoState:
    print("\n[0/4] Summary generation started...")
    structured_llm = llm.with_structured_output(SummarySchema, method="json_mode")

    prompt = PromptTemplate.from_template(SUMMARY_GENERATION_PROMPT)

    chain = prompt | structured_llm

    response = chain.invoke({"document": state["document"]})

    state["summary"] = response.summary
    state["core_focus"] = response.core_focus

    print("[0/4] Summary generation complete.")
    return state


def summary_hitl_agent(state: VideoState) -> VideoState:
    print("\n------ Document Summary & Core Focus ------\n")
    print("Summary:")
    print(state["summary"])
    print("\nCore Focus:")
    print(state["core_focus"])

    choice = input(
        "\nApprove this summary and core focus? "
        "Enter 0 to approve, or describe a refinement: "
    ).strip()

    if choice == "0" or choice == "":
        state["summary_edit_request"] = None
    else:
        state["summary_edit_request"] = choice

    return state


def summary_edit_agent(state: VideoState) -> VideoState:
    print("\n[Summary Edit] Refining summary and core focus...")
    structured_llm = llm.with_structured_output(SummarySchema, method="json_mode")

    prompt = PromptTemplate.from_template(SUMMARY_EDIT_PROMPT)

    chain = prompt | structured_llm

    response = chain.invoke(
        {
            "summary": state["summary"],
            "core_focus": state["core_focus"],
            "summary_edit_request": state["summary_edit_request"],
        }
    )

    state["summary"] = response.summary
    state["core_focus"] = response.core_focus
    state["summary_edit_request"] = None  # clear so hitl can loop cleanly

    print("[Summary Edit] Summary and core focus updated.")
    return state


# ── Existing pipeline agents ──────────────────────────────────────────────────


def scene_generation_agent(state: VideoState) -> VideoState:
    print("\n[1/4] Scene generation started...")
    structured_llm = llm.with_structured_output(SceneList, method="json_mode")

    prompt = PromptTemplate.from_template(SCENE_GENERATION_PROMPT)

    chain = prompt | structured_llm

    response = chain.invoke(
        {
            "document": state["document"],
            "summary": state.get("summary", ""),
            "core_focus": state.get("core_focus", ""),
            "level_of_explanation": state.get("level_of_explanation", "basic"),
        }
    )

    state["scenes"] = [scene.model_dump() for scene in response.scenes]

    print(f"[1/4] Scene generation complete — {len(state['scenes'])} scenes created.")
    return state


def grounding_agent(state: VideoState) -> VideoState:
    print("\n[2/4] Grounding & fact-check started...")
    prompt = PromptTemplate.from_template(GROUNDING_PROMPT)

    structured_llm = llm.with_structured_output(SceneList, method="json_mode")

    chain = prompt | structured_llm

    response = chain.invoke(
        {"document": state["document"], "scenes": json.dumps(state["scenes"], indent=2)}
    )

    state["scenes"] = [scene.model_dump() for scene in response.scenes]

    print("[2/4] Grounding complete.")
    return state


def image_generation_agent(state: VideoState) -> VideoState:
    print("\n[3/4] Image generation started...")
    images = {}

    for scene in state["scenes"]:
        print(f"      Generating image for Scene {scene['scene_id']}...")
        img = generate_image(scene["visual_description"], scene["scene_id"])
        images[scene["scene_id"]] = img
        print(f"      Scene {scene['scene_id']} image saved → {img}")

    state["images"] = images

    # Log the initial storyboard as Version 1
    log_storyboard_version(state, label="Initial Generation")

    print("[3/4] Image generation complete.")
    return state


def hitl_agent(state: VideoState) -> VideoState:
    print("\n------ Scenes Generated ------\n")

    for scene in state["scenes"]:
        print(f"\nScene {scene['scene_id']}")
        print("Title    :", scene["title"])
        print("Duration :", scene.get("duration", "?"), "seconds")
        print("Script   :", scene["script"])
        print("Visual   :", scene["visual_description"])
        print("Image    :", state["images"].get(scene["scene_id"], "N/A"))

    scene_id = int(
        input("\nEnter scene number to edit (0 to approve all & generate video): ")
    )

    if scene_id == 0:
        # Generate the final video before finishing
        print("\n[HITL] Approved! Starting video generation…")
        try:
            video_path = generate_video()
            print(f"[HITL] Video ready: {video_path}")
        except Exception as e:
            print(f"[HITL] Video generation failed: {e}")
        # Signal no edit needed — conditional edge will route to END
        state["edit_scene_id"] = None
        return state

    request = input("Describe the change: ")

    state["edit_scene_id"] = scene_id
    state["edit_request"] = request

    return state


def edit_agent(state: VideoState) -> VideoState:
    if state.get("edit_scene_id") is None:
        return state

    scene_id = state["edit_scene_id"]
    print(f"\n[Edit] Editing Scene {scene_id}...")

    scene = next((s for s in state["scenes"] if s["scene_id"] == scene_id), None)

    if scene is None:
        print(f"[edit_agent] Scene {scene_id} not found — skipping edit.")
        state["edit_scene_id"] = None
        return state

    structured_llm = llm.with_structured_output(SceneEdit, method="json_mode")

    prompt = PromptTemplate.from_template(EDIT_PROMPT)

    chain = prompt | structured_llm

    response = chain.invoke(
        {"scene": json.dumps(scene, indent=2), "edit_request": state["edit_request"]}
    )

    updated_scene = response.model_dump()

    for i, s in enumerate(state["scenes"]):
        if s["scene_id"] == scene_id:
            state["scenes"][i] = updated_scene
            break

    img = generate_image(updated_scene["visual_description"], scene_id)

    state["images"][scene_id] = img

    # Log this edited version before returning to hitl
    log_storyboard_version(state, label=f"Edit: Scene {scene_id}")

    # Reset edit fields so hitl can loop cleanly
    state["edit_scene_id"] = None
    state["edit_request"] = ""

    return state
