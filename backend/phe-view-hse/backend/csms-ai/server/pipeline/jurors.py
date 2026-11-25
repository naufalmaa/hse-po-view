import json
import os
import sys
from typing import Dict, Any, List

# Add engine to path so we can import jurors
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from engine.jurors.compliance_juror import ComplianceJuror
from engine.jurors.evidence_juror import EvidenceJuror
from engine.jurors.hse_juror import HSEJuror
from engine.utils.scoring import snap_to_csms_scale as _snap


def run_jurors(
    knowledge: Dict[str, Any],
    evidence_chunks: List[Dict[str, Any]],
    validation_results: Dict[str, Any],
    role: str = "reasoning_model",
) -> Dict[str, Any]:
    """
    Run all 3 AI jurors. Returns:
    {
      compliance: { score, confidence, reasoning },
      evidence:   { score, confidence, reasoning },
      hse:        { score, confidence, reasoning },
      juror_scores: { compliance: int, evidence: int, hse: int }
    }
    """
    # Build aggregated evidence dict for jurors
    aggregated_evidence = {
        "key_findings": [c["content"][:200] for c in evidence_chunks],
        "document_types_found": list({c["metadata"].get("extractor_used", "unknown") for c in evidence_chunks}),
        "knowledge_base": knowledge,
    }

    comp_juror = ComplianceJuror(role=role)
    ev_juror = EvidenceJuror(role=role)
    hse_juror = HSEJuror(role=role)

    comp_res = comp_juror.evaluate(knowledge, aggregated_evidence, validation_results)
    ev_res = ev_juror.evaluate(knowledge, aggregated_evidence, validation_results)
    hse_res = hse_juror.evaluate(knowledge, aggregated_evidence, validation_results)

    comp_score = _snap(comp_res.get("score", 6))
    ev_score = _snap(ev_res.get("score", 6))
    hse_score = _snap(hse_res.get("score", 6))

    return {
        "compliance": {"score": comp_score, "confidence": comp_res.get("confidence", 0.88), "reasoning": comp_res.get("reasoning", [])},
        "evidence": {"score": ev_score, "confidence": ev_res.get("confidence", 0.88), "reasoning": ev_res.get("reasoning", [])},
        "hse": {"score": hse_score, "confidence": hse_res.get("confidence", 0.88), "reasoning": hse_res.get("reasoning", [])},
        "juror_scores": {"compliance": comp_score, "evidence": ev_score, "hse": hse_score},
    }
