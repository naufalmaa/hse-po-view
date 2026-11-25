from typing import Dict, Any
from .base_validator import BaseValidator


class SemanticSearchValidator(BaseValidator):
    # ponytail: stub - upgrade to embedding-based semantic search when pgvector search integrated
    def validate(self, extracted_data: Dict[str, Any], rule_config: Dict[str, Any] = None) -> Dict[str, Any]:
        evidence = extracted_data.get("evidence", [])
        keywords = rule_config.get("ai_checkpoint_keywords", []) if rule_config else []
        if not keywords:
            return self._create_result(True, 0.6, "Semantic search stubbed - no keywords configured for this category.")

        combined = "\n".join(str(e) for e in evidence).lower()
        found = [kw for kw in keywords if kw.lower() in combined]
        ratio = len(found) / len(keywords) if keywords else 1.0
        return self._create_result(
            ratio > 0.3, ratio,
            f"Semantic search stubbed - matched {len(found)}/{len(keywords)} keywords via simple text search."
        )
