from typing import Dict, Any
from .base_validator import BaseValidator


class FormulaMetricValidator(BaseValidator):
    # ponytail: stub - upgrade to actual metric calculation when formula definitions available
    def validate(self, extracted_data: Dict[str, Any], rule_config: Dict[str, Any] = None) -> Dict[str, Any]:
        evidence = extracted_data.get("evidence", [])
        combined = "\n".join(str(e) for e in evidence).lower()
        numeric_indicators = ["%", "persen", "jumlah", "total", "rata-rata", "average", "hasil"]
        found = [ind for ind in numeric_indicators if ind in combined]
        if found:
            return self._create_result(True, 0.5, f"Formula metric stubbed - numeric indicators found: {found}")
        return self._create_result(False, 0.5, "Formula metric stubbed - no numeric/metric data detected.")
