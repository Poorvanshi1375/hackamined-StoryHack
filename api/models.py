from pydantic import BaseModel
from typing import List, Dict, Optional


class EditRequest(BaseModel):
    edit_request: str


class SceneOut(BaseModel):
    scene_id: int
    title: str
    script: str
    visual_description: str
    duration: int
    image: Optional[str] = None


class StartResponse(BaseModel):
    scenes: List[SceneOut]
    images: Dict[int, str]


class StoryboardResponse(BaseModel):
    version: int
    label: str
    timestamp: str
    scenes: List[SceneOut]


class ApproveRequest(BaseModel):
    scenes: List[Dict]
    images: Dict[str, str]
    selected_scenes: List[int]


class ApproveResponse(BaseModel):
    video_path: str


# ── Scene versioning models ──────────────────────────────────────────────────


class SetVersionRequest(BaseModel):
    version: int


class SceneVersionContent(BaseModel):
    title: str
    script: str
    visual_description: str
    duration: int


class SceneVersionsResponse(BaseModel):
    scene_id: int
    available_versions: List[int]
    active_version: int
    version_data: Dict[str, "SceneVersionContent"] = {}


class SceneStateResponse(BaseModel):
    # keys are stringified scene_ids (JSON only allows string keys)
    versions: Dict[str, int]


# ── Summary stage models ─────────────────────────────────────────────────────


class SummaryResponse(BaseModel):
    summary: str
    core_focus: str


class RefineSummaryRequest(BaseModel):
    summary: str
    core_focus: str
    edit_request: str


class ApproveSummaryRequest(BaseModel):
    document: str
    summary: str
    core_focus: str
    level_of_explanation: str = "basic"
