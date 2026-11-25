import json
import requests
from typing import Dict, Any
from .base_provider import BaseProvider

class OllamaProvider(BaseProvider):
    def __init__(self, config: Dict[str, Any]):
        self.model = config.get("model", "qwen3.5:27b")
        base_url = config.get("base_url", "http://localhost:5162/api/chat")
        if not base_url.rstrip('/').endswith('/api/chat'):
            self.base_url = base_url.rstrip('/') + '/api/chat'
        else:
            self.base_url = base_url
        self.temperature = config.get("temperature", 0.0)
        self.last_latency = 0.0
        self.last_input_tokens = 0
        self.last_output_tokens = 0

    def generate_response(self, prompt: str, system_prompt: str = None) -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": self.temperature
            }
        }
        
        response = requests.post(self.base_url, json=payload)
        response.raise_for_status()
        return response.json().get("message", {}).get("content", "")

    def generate_structured_response(self, prompt: str, schema: Dict[str, Any], system_prompt: str = None) -> Dict[str, Any]:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        # Instructing model to return JSON matching the schema
        instruction = f"\nRespond strictly with a single JSON object that adheres to the following schema:\n{json.dumps(schema)}\nDo not include any markdown formatting or extra text."
        if messages:
            messages[-1]["content"] += instruction
            
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "format": "json", # Assuming ollama supports format: json natively
            "options": {
                "temperature": self.temperature
            }
        }
        
        response = requests.post(self.base_url, json=payload)
        response.raise_for_status()
        content = response.json().get("message", {}).get("content", "")
        return json.loads(content)
