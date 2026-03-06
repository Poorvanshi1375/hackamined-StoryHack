# Single global in-memory state for the pipeline.
# No database, no sessions, no multi-user logic.

pipeline_state: dict = {}

# Scene versioning — key: scene_id (int), value: active version number (int)
active_scene_versions: dict = {}

# Tracks the highest version number generated per scene
scene_version_counter: dict = {}

# Stores scene content (title, script, visual_description, duration) per version
# Structure: {scene_id: {version: {title, script, visual_description, duration}}}
scene_version_data: dict = {}

# Tracks the selected voice per scene — key: scene_id (int), value: voice_name (str)
scene_voices: dict = {}
