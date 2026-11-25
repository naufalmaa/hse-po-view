import os

BASE_PROVIDER_CODE = """from abc import ABC, abstractmethod
from typing import Dict, Any

class BaseProvider(ABC):
    @abstractmethod
    def generate_response(self, prompt: str, system_prompt: str = None) -> str:
        pass

    @abstractmethod
    def generate_structured_response(self, prompt: str, schema: Dict[str, Any], system_prompt: str = None) -> Dict[str, Any]:
        pass
"""

OPENAI_PROVIDER_CODE = """import json
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
        
        # OpenAI supports JSON mode or Structured Outputs.
        # Assuming simple JSON mode and prompt-engineering for simplicity.
        messages[0]["content"] += f"\\nRespond strictly with JSON that adheres to the following schema:\\n{json.dumps(schema)}"
        
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
        content = response.choices[0].message.content
        return json.loads(content)
"""

OLLAMA_PROVIDER_CODE = """import json
import requests
from typing import Dict, Any
from .base_provider import BaseProvider

class OllamaProvider(BaseProvider):
    def __init__(self, config: Dict[str, Any]):
        self.model = config.get("model", "qwen3:32b")
        self.base_url = config.get("base_url", "http://localhostXX:5XXX/api/chat")
        self.temperature = config.get("temperature", 0.0)

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
        instruction = f"\\nRespond strictly with a single JSON object that adheres to the following schema:\\n{json.dumps(schema)}\\nDo not include any markdown formatting or extra text."
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
"""

PROVIDER_FACTORY_CODE = """import json
import os
from .base_provider import BaseProvider
from .openai_provider import OpenAIProvider
from .ollama_provider import OllamaProvider

def get_provider() -> BaseProvider:
    config_path = os.path.join(os.path.dirname(__file__), "..", "..", "configs", "model_config.json")
    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)
        
    active = config.get("active_provider", "openai")
    provider_config = config.get("providers", {}).get(active, {})
    
    if active == "openai":
        return OpenAIProvider(provider_config)
    elif active == "ollama":
        return OllamaProvider(provider_config)
    else:
        raise ValueError(f"Unknown provider: {active}")
"""

def create_files():
    providers_dir = "engine/providers"
    os.makedirs(providers_dir, exist_ok=True)
    
    with open(os.path.join(providers_dir, "base_provider.py"), "w", encoding="utf-8") as f:
        f.write(BASE_PROVIDER_CODE)
        
    with open(os.path.join(providers_dir, "openai_provider.py"), "w", encoding="utf-8") as f:
        f.write(OPENAI_PROVIDER_CODE)
        
    with open(os.path.join(providers_dir, "ollama_provider.py"), "w", encoding="utf-8") as f:
        f.write(OLLAMA_PROVIDER_CODE)
        
    with open(os.path.join(providers_dir, "provider_factory.py"), "w", encoding="utf-8") as f:
        f.write(PROVIDER_FACTORY_CODE)
        
    print("Provider layer created successfully.")

if __name__ == "__main__":
    create_files()
