import base64
import os
import time
import runpod
from dotenv import load_dotenv
import requests

load_dotenv()

RUNPOD_API_KEY = os.getenv("RUNPOD_API_KEY")

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


def generate_image(prompt, scene_id):
    print(f"\n[IMAGE GEN] Scene {scene_id}")

    print("[STEP 1] Preparing prompt")
    full_prompt = f"""
    {GLOBAL_STYLE}

    Scene description:
    {prompt}
    """

    payload = {
        "prompt": full_prompt,
        "size": "1024*1024",
        "seed": -1,
        "enable_safety_checker": True
    }

    print("[STEP 2] Creating RunPod endpoint object")
    endpoint = runpod.Endpoint(ENDPOINT_ID)

    print("[STEP 3] Submitting job to RunPod")
    start_time = time.time()

    job = endpoint.run({"input": payload})

    print(f"[STEP 4] Job submitted successfully")
    print(f"[JOB ID] {job.job_id}")

    poll_count = 0

    print("[STEP 5] Polling job status")

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
            print("[STEP 6] Job completed. Fetching output...")

            try:
                result = job.output()
            except Exception as e:
                print(f"[ERROR] Failed to fetch job output: {e}")
                raise

            print("[STEP 7] Output received")
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
                print(f"[STEP 8] Downloading image from URL: {img_url}")
                image_bytes = requests.get(img_url).content

            else:
                print("[ERROR] Unexpected RunPod output format")
                print(result)
                raise Exception(f"Unexpected RunPod output format")

            print("[STEP 9] Preparing filesystem")

            os.makedirs("images", exist_ok=True)

            path = f"images/scene_{scene_id}.png"

            print(f"[STEP 10] Writing image to disk → {path}")

            with open(path, "wb") as f:
                f.write(image_bytes)

            total_time = round(time.time() - start_time, 2)

            print(f"[SUCCESS] Scene {scene_id} image saved")
            print(f"[TOTAL TIME] {total_time}s")

            return path

        if status in ["FAILED", "CANCELLED"]:
            print(f"[ERROR] RunPod job failed with status: {status}")
            raise Exception(f"RunPod job failed")

        time.sleep(2)


if __name__ == "__main__":
    print("[TEST] Starting standalone image generation test")

    generate_image("A cat sitting on a table", 1)

    print("[TEST] Script finished")