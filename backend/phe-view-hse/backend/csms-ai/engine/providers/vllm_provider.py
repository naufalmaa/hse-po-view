import json
import os
import time
import requests
from typing import Dict, Any, Optional
from .base_provider import BaseProvider, LLMError


# Prompt size sent to the model (characters). qwen35 serves 16,384 tokens; ~40k characters of mixed
# Indonesian/English text plus a 2,048-token answer fits. Overflow is retried with a shorter prompt.
MAX_PROMPT_CHARS = int(os.getenv("LLM_MAX_PROMPT_CHARS", "40000"))


class VLLMProvider(BaseProvider):
    """
    vLLM provider (OpenAI-compatible /v1/chat/completions) with OpenAI fallback.

    Contract: returns real model output or raises LLMError. It never fabricates
    a result, so a failing LLM can no longer turn into a fake "score 10".
    """

    def __init__(self, config: Dict[str, Any]):
        self.model = config.get("model", "Qwen/Qwen2.5-7B-Instruct")
        endpoint = config.get("endpoint", config.get("base_url", "http://localhost:8000/v1"))
        self.endpoint = endpoint.rstrip('/')
        self.chat_url = f"{self.endpoint}/chat/completions"
        self.temperature = config.get("temperature", 0.1)
        self.max_tokens = config.get("max_tokens", 2048)
        self.api_key = config.get("api_key", "EMPTY")
        self.timeout = config.get("timeout", 180)

        # Metrics for evaluation reports / job.model_used
        self.last_latency = 0.0
        self.last_input_tokens = 0
        self.last_output_tokens = 0
        self.last_model_used = self.model

    # ------------------------------------------------------------------
    def _post(self, messages, json_mode: bool) -> str:
        payload = {
            "model": self.model,
            "messages": messages,
            "max_tokens": self.max_tokens,
            "temperature": self.temperature,
            "stream": False,
            # vLLM reads this top-level (extra_body is an OpenAI-SDK-only concept).
            "chat_template_kwargs": {"enable_thinking": False},
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        headers = {"Content-Type": "application/json", "Authorization": f"Bearer {self.api_key}"}

        start = time.time()
        resp = requests.post(self.chat_url, headers=headers, json=payload, timeout=self.timeout)
        if resp.status_code == 400 and json_mode:  # some servers reject response_format
            payload.pop("response_format", None)
            resp = requests.post(self.chat_url, headers=headers, json=payload, timeout=self.timeout)
        resp.raise_for_status()
        data = resp.json()
        self.last_latency = round(time.time() - start, 3)
        usage = data.get("usage", {})
        self.last_input_tokens = usage.get("prompt_tokens", 0)
        self.last_output_tokens = usage.get("completion_tokens", 0)
        self.last_model_used = self.model
        content = (data.get("choices") or [{}])[0].get("message", {}).get("content") or ""
        if not content.strip():
            raise LLMError("vLLM returned empty content")
        return content.strip()

    def _openai_fallback(self):
        from engine.providers.provider_factory import get_provider
        return get_provider(role="openai_reasoning")

    @staticmethod
    def _truncate(prompt: str, limit: int) -> str:
        if len(prompt) <= limit:
            return prompt
        return prompt[: int(limit * 0.75)] + "\n...[Content truncated for context window]...\n" + prompt[-int(limit * 0.2):]

    # ------------------------------------------------------------------
    def generate_response(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        prompt = self._truncate(prompt, MAX_PROMPT_CHARS)
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        try:
            return self._post(messages, json_mode=False)
        except Exception as e:
            print(f"[VLLM] request failed: {e}. Falling back to OpenAI...")
            try:
                fb = self._openai_fallback()
                out = fb.generate_response(prompt, system_prompt)
                self.last_model_used = getattr(fb, "model", "openai")
                return out
            except Exception as fe:
                raise LLMError(f"vLLM and OpenAI fallback both failed: {e} | {fe}") from fe

    def generate_structured_response(self, prompt: str, schema: Dict[str, Any], system_prompt: Optional[str] = None) -> Dict[str, Any]:
        prompt = self._truncate(prompt, MAX_PROMPT_CHARS)
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        instruction = (
            f"\nRespond strictly with a single JSON object that adheres to the following JSON schema:\n"
            f"{json.dumps(schema)}\n"
            "Do not include markdown formatting, code block backticks, or any explanation text outside the JSON."
        )
        messages.append({"role": "user", "content": prompt + instruction})

        err = None
        for attempt in range(2):  # one retry for transient errors / bad JSON
            try:
                raw = self._post(messages, json_mode=True)
                return self._parse_json_content(raw)
            except Exception as e:
                err = e
                print(f"[VLLM] attempt {attempt + 1} failed: {e}")
                if "400" in str(e):
                    # most likely the context window: retry with a shorter prompt
                    short = self._truncate(prompt, int(len(prompt) * 0.6))
                    messages[-1]["content"] = short + instruction
                time.sleep(1)

        print("[VLLM] Falling back to OpenAI...")
        try:
            fb = self._openai_fallback()
            out = fb.generate_structured_response(prompt, schema, system_prompt)
            self.last_model_used = getattr(fb, "model", "openai")
            return out
        except Exception as fe:
            raise LLMError(f"vLLM and OpenAI fallback both failed: {err} | {fe}") from fe

    @staticmethod
    def _parse_json_content(content: str) -> Dict[str, Any]:
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        start, end = content.find('{'), content.rfind('}')
        if start != -1 and end >= start:
            content = content[start:end + 1]
        try:
            return json.loads(content)
        except Exception as e:
            raise LLMError(f"Model did not return valid JSON: {e}") from e
