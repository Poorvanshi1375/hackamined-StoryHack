SUMMARY_GENERATION_PROMPT = """
You are a document analyst preparing material for an AI-powered explainer video system.

Given the following document:

{document}

Your task:
1. Write a concise SUMMARY that captures the essential ideas, key data points, and overall message of the document.
2. Identify the CORE FOCUS — the single most important concept or message the explainer video should emphasize.

The summary should be 3-5 sentences. The core focus should be one clear, specific sentence.

Respond in JSON using this exact structure:
{{"summary": "...", "core_focus": "..."}}
"""


SUMMARY_EDIT_PROMPT = """
You are an editing assistant refining a document summary and core focus for an explainer video.

Current summary:
{summary}

Current core focus:
{core_focus}

User edit request:
{summary_edit_request}

Apply the requested changes. Rewrite both the summary and the core focus according to the user's instruction.

CRITICAL RULES:
- You MUST return both fields, even if only one was changed.
- The core focus must remain a single clear sentence.
- The summary must remain 3-5 sentences.

Respond in JSON using this exact structure:
{{"summary": "...", "core_focus": "..."}}
"""


SCENE_GENERATION_PROMPT = """
You are a video storyboard generator.

Given the following research document:

{document}

Document summary:
{summary}

Core focus of the video:
{core_focus}

Create a storyboard for a short explainer video that is specifically aligned with the core focus above.

Keep the level of explanation {level_of_explanation}.

Rules:
- Decide the number of scenes dynamically (MAXIMUM ALLOWED SCENES: 2)
- Each scene must contain:
    scene_id
    title
    script (a actual script about the scene which can be used for voiceover)
    visual_description (visual description)
    duration (seconds)

Make sure the scenes are logically ordered and the script aligns well with the scene.
Every scene must reinforce the core focus: {core_focus}

Respond in JSON using this exact structure:
{{"scenes": [{{"scene_id": 1, "title": "...", "script": "...", "visual_description": "...", "duration": 30}}]}}

NOTE: MAXIMUM SCENES ALLOWED: 2
"""


GROUNDING_PROMPT = """
You are a fact checking assistant.

Given the document and generated scenes,
ensure that the script content is grounded
in the document and does not hallucinate.

If any scene script contains unsupported claims,
rewrite it to remain faithful to the source.

Document:
{document}

Scenes:
{scenes}

Respond in JSON using this exact structure:
{{"scenes": [{{"scene_id": 1, "title": "...", "script": "...", "visual_description": "...", "duration": 30}}]}}
"""


EDIT_PROMPT = """
You are an editing assistant.

A scene is shown below:

{scene}

User edit request:
{edit_request}

Apply the requested change and return the COMPLETE updated scene.

CRITICAL RULES:
- You MUST return ALL fields, even fields you did not change.
- Do NOT omit any field. Every field is required.

Respond in JSON using this EXACT structure (all fields mandatory):
{{"scene_id": <int>, "title": "...", "script": "...", "visual_description": "...", "duration": <int>}}
"""
