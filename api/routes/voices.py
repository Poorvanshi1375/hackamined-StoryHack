from fastapi import APIRouter

router = APIRouter(tags=["voices"])


@router.get("/voices")
async def get_voices():
    from tts import SUPPORTED_VOICES

    return {"voices": SUPPORTED_VOICES}
