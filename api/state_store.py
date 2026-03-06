# Single global in-memory state for the pipeline.
# No database, no sessions, no multi-user logic.
# This dict mirrors the VideoState TypedDict from coreutils/state.py.

pipeline_state: dict = {}
