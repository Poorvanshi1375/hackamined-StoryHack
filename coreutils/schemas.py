from pydantic import BaseModel, Field
from typing import List


class SceneSchema(BaseModel):
    scene_id: int = Field(description="Unique id of the scene")
    title: str
    script: str
    visual_description: str
    duration: int


class SceneList(BaseModel):
    scenes: List[SceneSchema]


class SceneEdit(BaseModel):
    scene_id: int
    title: str
    script: str
    visual_description: str
    duration: int