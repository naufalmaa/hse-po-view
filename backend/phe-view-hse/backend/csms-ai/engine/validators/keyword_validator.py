from typing import Dict, Any
from .base_validator import BaseValidator

class KeywordValidator(BaseValidator):
    def validate(self, extracted_data: Dict[str, Any], rule_config: Dict[str, Any] = None) -> Dict[str, Any]:
        combined_text = "\n".join(extracted_data.get("evidence", [])).lower()
        keywords = rule_config.get("ai_checkpoint_keywords", []) if rule_config else []
        
        if not keywords:
            return self._create_result(True, 1.0, "No keywords to validate against.")
            
        found = []
        missing = []
        for kw in keywords:
            if kw.lower() in combined_text:
                found.append(kw)
            else:
                missing.append(kw)
                
        is_valid = len(found) > 0
        conf = len(found) / len(keywords) if keywords else 1.0
        
        reasoning = f"Found {len(found)}/{len(keywords)} keywords. Missing: {', '.join(missing)}"
        return self._create_result(is_valid, conf, reasoning)
