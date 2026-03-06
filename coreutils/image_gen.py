import base64
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
    print(f"      Calling HuggingFace image API for scene {scene_id}...")

    full_prompt = f"{GLOBAL_STYLE}. {prompt}"

    payload = {
        "inputs": full_prompt
    }

    while True:
        r = requests.post(API_URL, headers=headers, json=payload)

        if r.status_code == 503:
            print("      Model loading...")
            time.sleep(8)
            continue

        if r.status_code != 200:
            print(f"      [ERROR] HuggingFace API failed: {r.text}")
            raise Exception(r.text)

        path = f"images/scene_{scene_id}.png"

        with open(path, "wb") as f:
            f.write(r.content)

        return path