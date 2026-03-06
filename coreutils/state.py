from typing import TypedDict, List, Dict, Optional


class Scene(TypedDict):
    scene_id: int
    title: str
    script: str
    visual_description: str
    duration: int


class VideoState(TypedDict):
    document: str
    summary: str
    scenes: List[Scene]
    images: Dict[int, str]
    edit_request: str
    edit_scene_id: Optional[int]