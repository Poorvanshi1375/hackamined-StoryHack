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


class ApproveResponse(BaseModel):
    video_path: str
