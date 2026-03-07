import base64
import os
import time
import runpod
from dotenv import load_dotenv
import requests
from groq import Groq

load_dotenv()

RUNPOD_API_KEY = os.getenv("RUNPOD_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

GLOBAL_STYLE = """
flat vector infographic,
modern explainer video style,
clean technical diagram,
minimalist presentation slide design,
simple geometric shapes, arrows and icons,
limited color palette (blue, teal, white, gray),
high readability,
white background,
professional educational infographic,
consistent visual language,
no photorealism, no complex textures, no artistic painting
"""

# ENDPOINT_ID = "qwen-image-t2i-lora"
ENDPOINT_ID = "z-image-turbo"

runpod.api_key = RUNPOD_API_KEY

groq_client = Groq(api_key=GROQ_API_KEY)


def expand_visual_prompt(scene_prompt, edit_request=None):
    print("[PROMPT EXPAND] Generating detailed visual description using Groq")

    user_prompt = f"""
Scene description:
{scene_prompt}

User edit request:
{edit_request if edit_request else "None"}

Generate a highly detailed visual description for an AI image generation model.

Focus on:
- layout
- composition
- icons
- arrows
- diagrams
- labels
- infographic elements

Avoid storytelling. Only describe what should visually appear in the image. Do only the edits, the user tells, nothing else.
"""

    try:
        completion = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            temperature=0.3,
            messages=[
                {
                    "role": "system",
                    "content": "You convert scene descriptions into detailed visual prompts for infographic-style AI image generation."
                },
                {
                    "role": "user",
                    "content": user_prompt
                }
            ]
        )

        detailed_prompt = completion.choices[0].message.content.strip()

        print("[PROMPT EXPAND] Prompt expansion completed")
        print("[PROMPT EXPAND] Detailed prompt:", detailed_prompt)

        return detailed_prompt

    except Exception as e:
        print("[PROMPT EXPAND ERROR]", e)
        print("[PROMPT EXPAND] Falling back to original prompt")

        return scene_prompt


def generate_image(prompt, scene_id):
    print(f"\n[IMAGE GEN] Scene {scene_id}")

    print("[STEP 1] Expanding prompt with Groq")
    expanded_prompt = expand_visual_prompt(prompt)

    print("[STEP 2] Preparing final image prompt")

    full_prompt = f"""
{GLOBAL_STYLE}

Detailed visual description:
{expanded_prompt}
"""

    payload = {
        "prompt": full_prompt,
        "size": "1024*1024",
        "seed": -1,
        "enable_safety_checker": True
    }

    print("[STEP 3] Creating RunPod endpoint object")
    endpoint = runpod.Endpoint(ENDPOINT_ID)

    print("[STEP 4] Submitting job to RunPod")
    start_time = time.time()

    job = endpoint.run({"input": payload})

    print("[STEP 5] Job submitted successfully")
    print(f"[JOB ID] {job.job_id}")

    poll_count = 0

    print("[STEP 6] Polling job status")

    while True:
        poll_count += 1

        try:
            status = job.status()
        except Exception as e:
            print(f"[ERROR] Failed to fetch job status: {e}")
            raise

        elapsed = round(time.time() - start_time, 2)

        print(
            f"[POLL {poll_count}] Status: {status} | Elapsed: {elapsed}s"
        )

        if status == "COMPLETED":
            print("[STEP 7] Job completed. Fetching output...")

            try:
                result = job.output()
            except Exception as e:
                print(f"[ERROR] Failed to fetch job output: {e}")
                raise

            print("[STEP 8] Output received")
            print(f"[OUTPUT TYPE] {type(result)}")

            if isinstance(result, list):
                print("[FORMAT] List detected")
                image_bytes = base64.b64decode(result[0])

            elif isinstance(result, dict) and "image" in result:
                print("[FORMAT] Dict with 'image'")
                image_bytes = base64.b64decode(result["image"])

            elif isinstance(result, dict) and "images" in result:
                print("[FORMAT] Dict with 'images'")
                image_bytes = base64.b64decode(result["images"][0])

            elif isinstance(result, dict) and "result" in result:
                print("[FORMAT] URL result detected")
                img_url = result["result"]
                print(f"[STEP 9] Downloading image from URL: {img_url}")
                image_bytes = requests.get(img_url).content

            else:
                print("[ERROR] Unexpected RunPod output format")
                print(result)
                raise Exception(f"Unexpected RunPod output format")

            print("[STEP 10] Preparing filesystem")

            os.makedirs("images", exist_ok=True)

            path = f"images/scene_{scene_id}.png"

            print(f"[STEP 11] Writing image to disk → {path}")

            with open(path, "wb") as f:
                f.write(image_bytes)

            total_time = round(time.time() - start_time, 2)

            print(f"[SUCCESS] Scene {scene_id} image saved")
            print(f"[TOTAL TIME] {total_time}s")

            return path

        if status in ["FAILED", "CANCELLED"]:
            print(f"[ERROR] RunPod job failed with status: {status}")
            raise Exception("RunPod job failed")

        time.sleep(2)


if __name__ == "__main__":
    print("[TEST] Starting standalone image generation test")

    generate_image("A cat sitting on a table", 1)

    print("[TEST] Script finished")