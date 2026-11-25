import json
from typing import Dict, Any, Optional
from engine.providers.provider_factory import get_provider
from engine.utils.scoring import snap_to_csms_scale


class ConsensusAgent:
    """
    Synthesizes verdicts from the 3 AI Jurors using equal weighting and strict CSMS scale (0, 3, 6, 10).
    Supports both resolve() and synthesize() interfaces.
    """
    def __init__(self, role: str = "consensus_model"):
        self.provider = get_provider(role=role)

    def resolve(self, comp_res: Dict[str, Any], ev_res: Dict[str, Any], hse_res: Dict[str, Any], kb: Optional[Any] = None, company_info: Dict[str, Any] = None) -> Dict[str, Any]:
        scores = [
            snap_to_csms_scale(comp_res.get("score", 6)),
            snap_to_csms_scale(ev_res.get("score", 6)),
            snap_to_csms_scale(hse_res.get("score", 6))
        ]
        raw_avg = sum(scores) / len(scores)
        discrete_consensus = snap_to_csms_scale(raw_avg)

        conf = round(
            (float(comp_res.get("confidence", 0.88)) +
             float(ev_res.get("confidence", 0.88)) +
             float(hse_res.get("confidence", 0.88))) / 3.0,
            2
        )
        max_diff = max(scores) - min(scores)
        requires_review = max_diff > 4

        requires_review = max_diff > 4
        
        company_info_str = f"\nCompany Information Context:\n{json.dumps(company_info, indent=2)}\n" if company_info else ""

        prompt = f"""Synthesize AI Juror scores:
{company_info_str}
Compliance Juror Score: {scores[0]} (Confidence: {comp_res.get('confidence')})
Reasoning: {comp_res.get('reasoning')}

Evidence Juror Score: {scores[1]} (Confidence: {ev_res.get('confidence')})
Reasoning: {ev_res.get('reasoning')}

HSE Juror Score: {scores[2]} (Confidence: {hse_res.get('confidence')})
Reasoning: {hse_res.get('reasoning')}

Calculated Equal-Weight CSMS Consensus Score: {discrete_consensus} (strictly 0, 3, 6, or 10)

Determine recommended_score (ONLY 0, 3, 6, or 10), confidence (0.0-1.0), requires_review (bool), reasoning, and recommendations_for_excellent_score (including actions and required_documents).

WRITING STYLE for reasoning, recommendations and required_documents: formal Bahasa Indonesia (English technical
terms are allowed), complete sentences, no emoji, no markdown symbols (#, *, **), no bullet characters.
reasoning: 2-3 sentences that state the decision and the decisive evidence or gap."""

        system_prompt = "You are the CSMS Consensus Agent. Synthesize independent AI Juror scores accurately into strict discrete CSMS values 0, 3, 6, or 10. You MUST return recommended_score as exactly 0, 3, 6, or 10."
        schema = {
            "type": "object",
            "properties": {
                "recommended_score": {"type": "number", "enum": [0, 3, 6, 10]},
                "confidence": {"type": "number"},
                "requires_review": {"type": "boolean"},
                "reasoning": {"type": "string"},
                "recommendations_for_excellent_score": {
                    "type": "object",
                    "properties": {
                        "recommendations": {"type": "array", "items": {"type": "string"}},
                        "required_documents": {"type": "array", "items": {"type": "string"}}
                    }
                }
            },
            "required": ["recommended_score", "confidence", "requires_review", "reasoning"]
        }
        try:
            res = self.provider.generate_structured_response(prompt, schema, system_prompt)
        except Exception as e:
            print(f"[CONSENSUS] LLM unavailable, using equal-weight average of juror scores: {e}")
            return {
                "recommended_score": discrete_consensus,
                "confidence": conf,
                "requires_review": True,
                "reasoning": f"Model konsensus tidak tersedia; skor diambil dari rata-rata tiga juri ({discrete_consensus}). Disarankan peninjauan manual.",
                "recommendations_for_excellent_score": None,
            }
        rs = res.get("recommended_score", discrete_consensus)
        final_score = rs if rs in {0, 3, 6, 10} else snap_to_csms_scale(rs)
        return {
            "recommended_score": final_score,
            "confidence": float(res.get("confidence", conf) or conf),
            "requires_review": bool(res.get("requires_review", requires_review)),
            "reasoning": res.get("reasoning", f"Equal-weighted consensus across 3 AI Jurors snapped to CSMS discrete scale ({final_score})."),
            "recommendations_for_excellent_score": res.get("recommendations_for_excellent_score")
        }

    def synthesize(self, category_id: str, juror_verdicts: Dict[str, Any], validation_results: Dict[str, Any], aggregated_evidence: Dict[str, Any], company_info: Dict[str, Any] = None) -> Dict[str, Any]:
        ev_str = json.dumps(aggregated_evidence, indent=2)
        if len(ev_str) > 150000:
            ev_str = ev_str[:130000] + "\n...[Additional evidence summary omitted]...\n" + ev_str[-15000:]

        company_info_str = f"\nCompany Information Context:\n{json.dumps(company_info, indent=2)}\n" if company_info else ""

        prompt = f"""Synthesize juror evaluations for Category {category_id}.
{company_info_str}
Juror Verdicts:
{json.dumps(juror_verdicts, indent=2)}

Provide final recommended score (STRICTLY 0, 3, 6, or 10), confidence (0.0 - 1.0), discrepancy resolution notes, and key missing items.
Return ONLY JSON adhering to schema."""

        system_prompt = "You are the CSMS Consensus Agent. You MUST return final_score as exactly 0, 3, 6, or 10. No other values."
        schema = {
            "type": "object",
            "properties": {
                "final_score": {"type": "number", "enum": [0, 3, 6, 10]},
                "confidence": {"type": "number"},
                "consensus_reasoning": {"type": "string"},
                "discrepancy_resolution": {"type": "string"},
                "missing_items": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["final_score", "confidence", "consensus_reasoning", "discrepancy_resolution", "missing_items"]
        }
        res = self.provider.generate_structured_response(prompt, schema, system_prompt)
        fs = res.get("final_score", 6)
        res["final_score"] = fs if fs in {0, 3, 6, 10} else snap_to_csms_scale(fs)
        return res
