import os

VALIDATOR_BASE = """from typing import Dict, Any

class BaseValidator:
    def validate(self, extracted_data: Dict[str, Any], rule_config: Dict[str, Any] = None) -> Dict[str, Any]:
        raise NotImplementedError
        
    def _create_result(self, is_valid: bool, confidence: float, reasoning: str) -> Dict[str, Any]:
        return {
            "is_valid": is_valid,
            "confidence": confidence,
            "reasoning": reasoning
        }
"""

DATE_VALIDATOR = """import re
from typing import Dict, Any
from .base_validator import BaseValidator

class DateValidator(BaseValidator):
    def validate(self, extracted_data: Dict[str, Any], rule_config: Dict[str, Any] = None) -> Dict[str, Any]:
        # Deterministic date extraction using regex
        combined_text = "\\n".join(extracted_data.get("evidence", []))
        date_pattern = r'\\b\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}\\b'
        dates_found = re.findall(date_pattern, combined_text)
        
        if dates_found:
            return self._create_result(True, 1.0, f"Dates found: {', '.join(dates_found)}")
        return self._create_result(False, 1.0, "No valid dates found in the document.")
"""

EXPIRY_VALIDATOR = """from typing import Dict, Any
from .base_validator import BaseValidator
# In reality, this would parse dates and compare to current date

class ExpiryValidator(BaseValidator):
    def validate(self, extracted_data: Dict[str, Any], rule_config: Dict[str, Any] = None) -> Dict[str, Any]:
        combined_text = "\\n".join(extracted_data.get("evidence", [])).lower()
        
        # Simple heuristic: look for "expired", "valid until", etc.
        if "expired" in combined_text:
            return self._create_result(False, 0.9, "Document appears to be expired based on keywords.")
            
        return self._create_result(True, 0.7, "No explicit expiry found, assuming valid for now.")
"""

SIGNATURE_VALIDATOR = """from typing import Dict, Any
from .base_validator import BaseValidator

class SignatureValidator(BaseValidator):
    def validate(self, extracted_data: Dict[str, Any], rule_config: Dict[str, Any] = None) -> Dict[str, Any]:
        combined_text = "\\n".join(extracted_data.get("evidence", [])).lower()
        
        if "signature" in combined_text or "ttd" in combined_text or "tanda tangan" in combined_text or "signed" in combined_text:
            return self._create_result(True, 0.8, "Signature indication found in text.")
            
        return self._create_result(False, 0.8, "No signature detected.")
"""

KEYWORD_VALIDATOR = """from typing import Dict, Any
from .base_validator import BaseValidator

class KeywordValidator(BaseValidator):
    def validate(self, extracted_data: Dict[str, Any], rule_config: Dict[str, Any] = None) -> Dict[str, Any]:
        combined_text = "\\n".join(extracted_data.get("evidence", [])).lower()
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
"""

# Stubs for the rest, following similar pattern
STUB_VALIDATOR = """from typing import Dict, Any
from .base_validator import BaseValidator

class {class_name}(BaseValidator):
    def validate(self, extracted_data: Dict[str, Any], rule_config: Dict[str, Any] = None) -> Dict[str, Any]:
        return self._create_result(True, 0.5, "{class_name} validation stubbed - assumed valid.")
"""

VALIDATOR_ROUTER = """from typing import Dict, Any, List
from .date_validator import DateValidator
from .expiry_validator import ExpiryValidator
from .signature_validator import SignatureValidator
from .keyword_validator import KeywordValidator
from .completeness_validator import CompletenessValidator
from .competency_validator import CompetencyValidator
from .consistency_validator import ConsistencyValidator
from .certificate_validator import CertificateValidator

class ValidatorEngine:
    def __init__(self):
        self.validators = {
            "date_validation": DateValidator(),
            "expiry_validator": ExpiryValidator(),
            "signature_check": SignatureValidator(),
            "keyword_search": KeywordValidator(),
            "completeness_validator": CompletenessValidator(),
            "competency_validator": CompetencyValidator(),
            "consistency_validator": ConsistencyValidator(),
            "certificate_validator": CertificateValidator()
        }

    def run_validations(self, validation_methods: List[str], extracted_data: Dict[str, Any], rule_config: Dict[str, Any]) -> Dict[str, Any]:
        results = {}
        for method in validation_methods:
            method_key = method.strip().lower()
            if method_key in self.validators:
                results[method_key] = self.validators[method_key].validate(extracted_data, rule_config)
            else:
                results[method_key] = {"is_valid": False, "confidence": 1.0, "reasoning": f"Validator '{method_key}' not found."}
        return results
"""

def create_files():
    val_dir = "engine/validators"
    
    with open(os.path.join(val_dir, "base_validator.py"), "w", encoding="utf-8") as f:
        f.write(VALIDATOR_BASE)
        
    with open(os.path.join(val_dir, "date_validator.py"), "w", encoding="utf-8") as f:
        f.write(DATE_VALIDATOR)
        
    with open(os.path.join(val_dir, "expiry_validator.py"), "w", encoding="utf-8") as f:
        f.write(EXPIRY_VALIDATOR)
        
    with open(os.path.join(val_dir, "signature_validator.py"), "w", encoding="utf-8") as f:
        f.write(SIGNATURE_VALIDATOR)
        
    with open(os.path.join(val_dir, "keyword_validator.py"), "w", encoding="utf-8") as f:
        f.write(KEYWORD_VALIDATOR)
        
    stubs = {
        "completeness_validator.py": "CompletenessValidator",
        "competency_validator.py": "CompetencyValidator",
        "consistency_validator.py": "ConsistencyValidator",
        "certificate_validator.py": "CertificateValidator"
    }
    
    for filename, class_name in stubs.items():
        with open(os.path.join(val_dir, filename), "w", encoding="utf-8") as f:
            f.write(STUB_VALIDATOR.replace("{class_name}", class_name))
            
    with open(os.path.join(val_dir, "engine.py"), "w", encoding="utf-8") as f:
        f.write(VALIDATOR_ROUTER)

    print("Validators created successfully.")

if __name__ == "__main__":
    create_files()
