import json
import os
from typing import Dict, Any, Optional
from .base_provider import BaseProvider
from .openai_provider import OpenAIProvider
from .ollama_provider import OllamaProvider
from .vllm_provider import VLLMProvider

# role -> env prefix, so endpoint/model can differ per environment without editing JSON
_ENV_PREFIX = {
    "reasoning_model": "LLM_REASONING",
    "consensus_model": "LLM_CONSENSUS",
    "vision_model": "LLM_VISION",
}


def get_provider(role: str = "reasoning_model", config_path: Optional[str] = None) -> BaseProvider:
    """
    Provider for a model role. Base config: configs/model_roles.json.
    Overrides (all optional): LLM_<ROLE>_ENDPOINT, LLM_<ROLE>_MODEL, LLM_TIMEOUT_SECONDS,
    OPENAI_FALLBACK_MODEL (for openai_* roles). Env is loaded by server.config (honours ENV_FILE).
    """
    try:
        import server.config  # noqa: F401  (loads the right .env file)
    except Exception:
        pass

    roles_file = os.path.join(os.path.dirname(__file__), "..", "..", "configs", "model_roles.json")
    role_config: Dict[str, Any] = {}
    if os.path.exists(roles_file):
        try:
            with open(roles_file, "r", encoding="utf-8") as f:
                role_config = dict(json.load(f).get(role, {}))
        except Exception:
            role_config = {}

    provider_name = role_config.get("provider", "vllm")

    if not role_config:
        cfg_path = config_path or os.path.join(os.path.dirname(__file__), "..", "..", "configs", "model_config.json")
        if os.path.exists(cfg_path):
            with open(cfg_path, "r", encoding="utf-8") as f:
                cfg = json.load(f)
            provider_name = cfg.get("active_provider", "ollama")
            role_config = dict(cfg.get("providers", {}).get(provider_name, {}))

    prefix = _ENV_PREFIX.get(role)
    if prefix:
        if os.getenv(f"{prefix}_ENDPOINT"):
            role_config["endpoint"] = os.environ[f"{prefix}_ENDPOINT"]
        if os.getenv(f"{prefix}_MODEL"):
            role_config["model"] = os.environ[f"{prefix}_MODEL"]
    if provider_name == "openai" and os.getenv("OPENAI_FALLBACK_MODEL"):
        role_config["model"] = os.environ["OPENAI_FALLBACK_MODEL"]
    if os.getenv("LLM_TIMEOUT_SECONDS"):
        role_config["timeout"] = int(os.environ["LLM_TIMEOUT_SECONDS"])

    if provider_name == "vllm":
        return VLLMProvider(role_config)
    elif provider_name == "openai":
        return OpenAIProvider(role_config)
    elif provider_name == "ollama":
        return OllamaProvider(role_config)
    raise ValueError(f"Unsupported provider: {provider_name} for role {role}")
