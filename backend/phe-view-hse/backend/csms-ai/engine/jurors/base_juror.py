from typing import Dict, Any
from engine.providers.provider_factory import get_provider

class BaseJuror:
    def __init__(self, role: str = "reasoning_model"):
        self.role = role
        self.provider = get_provider(role=role)

    def evaluate(self, category_definition: Dict[str, Any], aggregated_evidence: Dict[str, Any], validation_results: Dict[str, Any], company_info: Dict[str, Any] = None) -> Dict[str, Any]:
        raise NotImplementedError
