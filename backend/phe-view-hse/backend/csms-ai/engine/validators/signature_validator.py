from typing import Dict, Any
from .base_validator import BaseValidator

class SignatureValidator(BaseValidator):
    def validate(self, extracted_data: Dict[str, Any], rule_config: Dict[str, Any] = None) -> Dict[str, Any]:
        combined_text = "\n".join(extracted_data.get("evidence", [])).lower()
        
        if "signature" in combined_text or "ttd" in combined_text or "tanda tangan" in combined_text or "signed" in combined_text:
            return self._create_result(True, 0.8, "Signature indication found in text.")
            
        return self._create_result(False, 0.8, "No signature detected.")
