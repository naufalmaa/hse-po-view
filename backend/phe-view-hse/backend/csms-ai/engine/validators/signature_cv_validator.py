from typing import Dict, Any
from .base_validator import BaseValidator


class SignatureComputerVisionValidator(BaseValidator):
    # ponytail: stub - upgrade to CV model (OpenCV + signature detection) when vision infra ready
    def validate(self, extracted_data: Dict[str, Any], rule_config: Dict[str, Any] = None) -> Dict[str, Any]:
        combined = "\n".join(str(e) for e in extracted_data.get("evidence", [])).lower()
        indicators = ["signature", "ttd", "tanda tangan", "signed", "ditandatangani", "sign"]
        found = [ind for ind in indicators if ind in combined]
        if found:
            return self._create_result(True, 0.6, f"Signature CV stubbed - text indicators found: {found}")
        return self._create_result(False, 0.6, "Signature CV stubbed - no signature indicators detected.")
