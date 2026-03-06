import os
import requests
import time
from dotenv import load_dotenv

load_dotenv()

HF_API_KEY = os.getenv("HF_API_KEY")

GLOBAL_STYLE = """
clean scientific infographic style,
minimal colors,
professional academic presentation,
consistent visual theme
"""

API_URL = "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0"

headers = {
    "Authorization": f"Bearer {HF_API_KEY}",
    "Content-Type": "application/json"
}


def generate_image(prompt, scene_id):
    print(f"\n[IMAGE GEN] Scene {scene_id}")
    print("[STEP 1] Preparing prompt")

    full_prompt = f"{GLOBAL_STYLE}. {prompt}"
    print("[PROMPT]", full_prompt)

    payload = {"inputs": full_prompt}

    retries = 0
    max_retries = 10

    while retries < max_retries:
        try:
            print(f"[STEP 2] Sending request to HuggingFace (attempt {retries+1})")

            r = requests.post(
                API_URL,
                headers=headers,
                json=payload,
                timeout=120
            )

            print("[STEP 3] Response received")
            print("[STATUS CODE]", r.status_code)

        except requests.exceptions.Timeout:
            print("[ERROR] Request timed out")
            retries += 1
            continue

        except Exception as e:
            print("[ERROR] Request failed:", e)
            retries += 1
            continue

        if r.status_code == 503:
            print("[MODEL STATUS] Model loading on HuggingFace...")
            retries += 1
            time.sleep(8)
            continue

        if r.status_code != 200:
            print("[ERROR] HuggingFace API error:", r.text)
            raise Exception(r.text)

        print("[STEP 4] Writing image file")

        path = f"images/scene_{scene_id}.png"

        os.makedirs("images", exist_ok=True)

        with open(path, "wb") as f:
            f.write(r.content)

        print("[SUCCESS] Image saved:", path)

        return path

    raise Exception("HuggingFace model failed after multiple retries")


if __name__ == "__main__":
    generate_image("A cat sitting on a windowsill", 1)