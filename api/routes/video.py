import os

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter(prefix="/video", tags=["video"])

VIDEO_PATH = "output_video.mp4"


@router.get(
    "/",
    summary="Download the generated MP4 video",
    response_class=FileResponse,
)
async def get_video():
    """Stream the final rendered video file back to the client."""
    if not os.path.isfile(VIDEO_PATH):
        raise HTTPException(
            status_code=404,
            detail="Video not found. Run POST /pipeline/approve first.",
        )

    return FileResponse(
        path=VIDEO_PATH,
        media_type="video/mp4",
        filename="output_video.mp4",
    )
