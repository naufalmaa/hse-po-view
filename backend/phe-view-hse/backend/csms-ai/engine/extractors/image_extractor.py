import os
import base64
import requests
import json
from .base_extractor import BaseExtractor
from typing import Dict, Any

class ImageExtractor(BaseExtractor):
    def __init__(self, vision_url: str = "http://localhost:8002/v1/chat/completions", model: str = "Qwen/Qwen3-VL-8B-Instruct"):
        self.vision_url = vision_url
        self.model = model

    def extract(self, file_path: str) -> Dict[str, Any]:
        evidence_chunks = []
        confidence = 0.0
        filename = os.path.basename(file_path)

        try:
            with open(file_path, "rb") as f:
                b64_str = base64.b64encode(f.read()).decode("utf-8")
            
            ext = os.path.splitext(file_path)[1].lower().replace(".", "")
            mime = f"image/{ext}" if ext in ["png", "jpg", "jpeg", "webp", "gif"] else "image/jpeg"

            payload = {
                "model": self.model,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Transcribe all text, tables, headers, and emails visible in this image verbatim. Do not omit any text."
                            },
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:{mime};base64,{b64_str}"}
                            }
                        ]
                    }
                ],
                "max_tokens": 1000,
                "temperature": 0.1
            }

            response = requests.post(self.vision_url, json=payload, timeout=30)
            if response.status_code == 200:
                data = response.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                if content:
                    evidence_chunks = [p.strip() for p in content.split("\n\n") if p.strip()]
                    confidence = 0.96
        except Exception as e:
            pass

        return self._create_response("image", {"filename": filename, "pages": 1}, evidence_chunks, confidence)
