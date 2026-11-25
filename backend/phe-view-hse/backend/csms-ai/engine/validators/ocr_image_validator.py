from typing import Dict, Any
from .base_validator import BaseValidator


class OcrImageValidator(BaseValidator):
    # ponytail: stub - upgrade to tesseract/easyocr pipeline when OCR infra ready
    def validate(self, extracted_data: Dict[str, Any], rule_config: Dict[str, Any] = None) -> Dict[str, Any]:
        evidence = extracted_data.get("evidence", [])
        has_content = any(len(str(e).strip()) > 20 for e in evidence)
        if has_content:
            return self._create_result(True, 0.6, "OCR processing stubbed - text content present in evidence.")
        return self._create_result(False, 0.6, "OCR processing stubbed - no meaningful text content found.")
