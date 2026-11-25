from typing import Dict, Any
from .base_validator import BaseValidator


class CrossReferenceRosterValidator(BaseValidator):
    # ponytail: stub - upgrade to cross-doc roster matching when multi-doc linking ready
    def validate(self, extracted_data: Dict[str, Any], rule_config: Dict[str, Any] = None) -> Dict[str, Any]:
        evidence = extracted_data.get("evidence", [])
        combined = "\n".join(str(e) for e in evidence).lower()
        roster_indicators = ["nama", "name", "nik", "nip", "jabatan", "position", "crew", "pekerja"]
        found = [ind for ind in roster_indicators if ind in combined]
        if found:
            return self._create_result(True, 0.5, f"Cross-reference roster stubbed - personnel indicators: {found}")
        return self._create_result(False, 0.5, "Cross-reference roster stubbed - no personnel/roster data detected.")
