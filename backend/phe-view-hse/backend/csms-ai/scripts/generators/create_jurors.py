import os

JUROR_BASE = """from typing import Dict, Any
from engine.providers.provider_factory import get_provider

class BaseJuror:
    def __init__(self):
        self.provider = get_provider()

    def evaluate(self, category_definition: Dict[str, Any], aggregated_evidence: Dict[str, Any], validation_results: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError
"""

COMPLIANCE_JUROR = """import json
from typing import Dict, Any
from .base_juror import BaseJuror

class ComplianceJuror(BaseJuror):
    def evaluate(self, category_definition: Dict[str, Any], aggregated_evidence: Dict[str, Any], validation_results: Dict[str, Any]) -> Dict[str, Any]:
        prompt = f\"\"\"Evaluate compliance strictly based on the scoring rules.
Category: {json.dumps(category_definition, indent=2)}
Evidence: {json.dumps(aggregated_evidence, indent=2)}
Validations: {json.dumps(validation_results, indent=2)}
\"\"\"
        system_prompt = "You are the Compliance Juror. Assess if the rules and criteria are mathematically and logically fulfilled. Do not infer."
        schema = {
            "type": "object",
            "properties": {
                "score": {"type": "number"},
                "confidence": {"type": "number"},
                "reasoning": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["score", "confidence", "reasoning"]
        }
        return self.provider.generate_structured_response(prompt, schema, system_prompt)
"""

EVIDENCE_JUROR = """import json
from typing import Dict, Any
from .base_juror import BaseJuror

class EvidenceJuror(BaseJuror):
    def evaluate(self, category_definition: Dict[str, Any], aggregated_evidence: Dict[str, Any], validation_results: Dict[str, Any]) -> Dict[str, Any]:
        prompt = f\"\"\"Evaluate evidence quality and completeness.
Category: {json.dumps(category_definition, indent=2)}
Evidence: {json.dumps(aggregated_evidence, indent=2)}
Validations: {json.dumps(validation_results, indent=2)}
\"\"\"
        system_prompt = "You are the Evidence Juror. Assess the quality, depth, and validity of the evidence."
        schema = {
            "type": "object",
            "properties": {
                "score": {"type": "number"},
                "confidence": {"type": "number"},
                "reasoning": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["score", "confidence", "reasoning"]
        }
        return self.provider.generate_structured_response(prompt, schema, system_prompt)
"""

HSE_JUROR = """import json
from typing import Dict, Any
from .base_juror import BaseJuror

class HSEJuror(BaseJuror):
    def evaluate(self, category_definition: Dict[str, Any], aggregated_evidence: Dict[str, Any], validation_results: Dict[str, Any]) -> Dict[str, Any]:
        prompt = f\"\"\"Evaluate HSE real-world implications.
Category: {json.dumps(category_definition, indent=2)}
Evidence: {json.dumps(aggregated_evidence, indent=2)}
Validations: {json.dumps(validation_results, indent=2)}
\"\"\"
        system_prompt = "You are the HSE Juror. Interpret the findings from a real-world HSE Auditor perspective."
        schema = {
            "type": "object",
            "properties": {
                "score": {"type": "number"},
                "confidence": {"type": "number"},
                "reasoning": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["score", "confidence", "reasoning"]
        }
        return self.provider.generate_structured_response(prompt, schema, system_prompt)
"""

CONSENSUS_AGENT = """import json
from typing import Dict, Any
from engine.providers.provider_factory import get_provider

class ConsensusAgent:
    def __init__(self):
        self.provider = get_provider()

    def resolve(self, compliance_result: Dict[str, Any], evidence_result: Dict[str, Any], hse_result: Dict[str, Any], category_definition: Dict[str, Any]) -> Dict[str, Any]:
        prompt = f\"\"\"Resolve the final score from the three jurors.
Category: {json.dumps(category_definition, indent=2)}
Compliance Juror: {json.dumps(compliance_result, indent=2)}
Evidence Juror: {json.dumps(evidence_result, indent=2)}
HSE Juror: {json.dumps(hse_result, indent=2)}
\"\"\"
        system_prompt = "You are the Consensus Agent. Review the juror scores, resolve conflicts, and issue the final recommended score based on the category's strict criteria."
        schema = {
            "type": "object",
            "properties": {
                "recommended_score": {"type": "number"},
                "confidence": {"type": "number"},
                "requires_review": {"type": "boolean"},
                "evidence_found": {"type": "array", "items": {"type": "string"}},
                "missing_evidence": {"type": "array", "items": {"type": "string"}},
                "reasoning": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["recommended_score", "confidence", "requires_review", "evidence_found", "missing_evidence", "reasoning"]
        }
        return self.provider.generate_structured_response(prompt, schema, system_prompt)
"""

def create_files():
    juror_dir = "engine/jurors"
    consensus_dir = "engine/consensus"
    
    with open(os.path.join(juror_dir, "base_juror.py"), "w", encoding="utf-8") as f:
        f.write(JUROR_BASE)
        
    with open(os.path.join(juror_dir, "compliance_juror.py"), "w", encoding="utf-8") as f:
        f.write(COMPLIANCE_JUROR)
        
    with open(os.path.join(juror_dir, "evidence_juror.py"), "w", encoding="utf-8") as f:
        f.write(EVIDENCE_JUROR)
        
    with open(os.path.join(juror_dir, "hse_juror.py"), "w", encoding="utf-8") as f:
        f.write(HSE_JUROR)
        
    with open(os.path.join(consensus_dir, "consensus_agent.py"), "w", encoding="utf-8") as f:
        f.write(CONSENSUS_AGENT)
        
    print("Jurors and Consensus Agent created successfully.")

if __name__ == "__main__":
    create_files()
