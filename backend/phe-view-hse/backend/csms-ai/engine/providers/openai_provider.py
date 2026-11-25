import json
import os
from typing import Dict, Any
from .base_provider import BaseProvider

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

class OpenAIProvider(BaseProvider):
    def __init__(self, config: Dict[str, Any]):
        if not OpenAI:
            raise ImportError("openai package is required for OpenAIProvider")
        self.model = config.get("model", "gpt-5-mini")
        self.temperature = config.get("temperature", 0.0)
        # Using environment variable OPENAI_API_KEY
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.last_latency = 0.0
        self.last_input_tokens = 0
        self.last_output_tokens = 0

    def generate_response(self, prompt: str, system_prompt: str = None) -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=self.temperature
            )
        except Exception as e:
            if "temperature" in str(e).lower() or "unsupported_value" in str(e).lower():
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages
                )
            else:
                raise e
        return response.choices[0].message.content

    def generate_structured_response(self, prompt: str, schema: Dict[str, Any], system_prompt: str = None) -> Dict[str, Any]:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        messages[-1]["content"] += f"\n\nRespond strictly with valid JSON only adhering to this schema:\n{json.dumps(schema)}"
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=self.temperature,
                response_format={ "type": "json_object" }
            )
        except Exception as e:
            if "temperature" in str(e).lower() or "unsupported_value" in str(e).lower():
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    response_format={ "type": "json_object" }
                )
            else:
                raise e
        content = response.choices[0].message.content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        return json.loads(content.strip())
