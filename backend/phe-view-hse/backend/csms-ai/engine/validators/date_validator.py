import re
from typing import Dict, Any
from .base_validator import BaseValidator

class DateValidator(BaseValidator):
    def validate(self, extracted_data: Dict[str, Any], rule_config: Dict[str, Any] = None) -> Dict[str, Any]:
        # Deterministic date extraction using regex
        combined_text = "\n".join(extracted_data.get("evidence", []))
        date_pattern = r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b'
        dates_found = re.findall(date_pattern, combined_text)
        
        if dates_found:
            return self._create_result(True, 1.0, f"Dates found: {', '.join(dates_found)}")
        return self._create_result(False, 1.0, "No valid dates found in the document.")
