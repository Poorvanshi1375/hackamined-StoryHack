import asyncio
import edge_tts

SUPPORTED_VOICES = [
    "en-US-AriaNeural",
    "en-US-JennyNeural",
    "en-US-GuyNeural",
    "en-GB-SoniaNeural",
]

DEFAULT_VOICE = "en-US-AriaNeural"


async def _generate(text: str, output: str, voice: str):
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output)


def generate_tts_audio(text: str, output_path: str, voice: str):
    """Synchronous wrapper to generate TTS audio using edge-tts."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        # If we are already in an event loop (e.g., inside FastAPI), wait for the coroutine
        # Since it's synchronous calling async, run_coroutine_threadsafe would be needed if separate thread,
        # but the easiest way here is creating a new event loop in a new thread or using run_coroutine_threadsafe.
        # Alternatively, because FastAPI endpoints can use async, we could make generate_tts_audio async.
        # However, to meet constraints of sync wrapper:
        import threading

        def run_in_thread():
            new_loop = asyncio.new_event_loop()
            asyncio.set_event_loop(new_loop)
            new_loop.run_until_complete(_generate(text, output_path, voice))
            new_loop.close()

        t = threading.Thread(target=run_in_thread)
        t.start()
        t.join()
    else:
        asyncio.run(_generate(text, output_path, voice))
