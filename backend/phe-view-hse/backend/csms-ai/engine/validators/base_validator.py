from typing import Dict, Any

class BaseValidator:
    def validate(self, extracted_data: Dict[str, Any], rule_config: Dict[str, Any] = None) -> Dict[str, Any]:
        raise NotImplementedError
        
    def _create_result(self, is_valid: bool, confidence: float, reasoning: str) -> Dict[str, Any]:
        return {
            "is_valid": is_valid,
            "confidence": confidence,
            "reasoning": reasoning
        }
