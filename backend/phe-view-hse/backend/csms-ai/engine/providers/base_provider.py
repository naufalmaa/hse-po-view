from abc import ABC, abstractmethod
from typing import Dict, Any


class LLMError(Exception):
    """Raised when no LLM (primary or fallback) produced a usable answer.

    Callers must treat this as "AI unavailable" and never invent a score.
    """


class BaseProvider(ABC):
    @abstractmethod
    def generate_response(self, prompt: str, system_prompt: str = None) -> str:
        pass

    @abstractmethod
    def generate_structured_response(self, prompt: str, schema: Dict[str, Any], system_prompt: str = None) -> Dict[str, Any]:
        pass
