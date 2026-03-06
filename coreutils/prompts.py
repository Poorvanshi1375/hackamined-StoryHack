SCENE_GENERATION_PROMPT = """
You are a video storyboard generator.

Given the following research document:

{document}

Create a storyboard for a short explainer video.

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
