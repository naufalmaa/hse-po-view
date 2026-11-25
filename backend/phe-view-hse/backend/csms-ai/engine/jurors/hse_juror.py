import json
from typing import Dict, Any
from .base_juror import BaseJuror
from engine.utils.scoring import snap_to_csms_scale
from engine.providers.base_provider import LLMError

VALID_SCORES = {0, 3, 6, 10}


class HSEJuror(BaseJuror):
    def __init__(self, role: str = "reasoning_model"):
        super().__init__(role=role)

    def evaluate(self, category_definition: Dict[str, Any], aggregated_evidence: Dict[str, Any], validation_results: Dict[str, Any], company_info: Dict[str, Any] = None) -> Dict[str, Any]:
        # Truncate large documents safely to maintain valid JSON structure
        MAX_CHUNK_CHARS = 40000
        if "EXTRACTED_DOCUMENT_TEXTS" in aggregated_evidence:
            for doc in aggregated_evidence["EXTRACTED_DOCUMENT_TEXTS"]:
                text_content = doc.get("extracted_text_content", "")
                if len(text_content) > MAX_CHUNK_CHARS:
                    doc["extracted_text_content"] = text_content[:MAX_CHUNK_CHARS] + "\n...[Text truncated for length]..."

        try:
            ev_str = json.dumps(aggregated_evidence, ensure_ascii=False, indent=2)
        except Exception:
            ev_str = str(aggregated_evidence)

        company_info_str = f"\nCompany Information Context:\n{json.dumps(company_info, indent=2)}\n\nIMPORTANT: Use the above Company Information Context (especially company name, project title, and dates) to verify if the submitted evidence is relevant and valid for this specific project and company.\n" if company_info else ""

        prompt = f"""Evaluate HSE (Health, Safety, Environment) program implementation based on the evidence submitted.
{company_info_str}
CRITICAL SCORING RULE: You MUST assign EXACTLY ONE of these scores: 0, 3, 6, or 10.
Do NOT assign any other value (e.g., 4, 7, 8.5). Only these four discrete values are valid.

OBJECTIVE RUBRIC:
- 10 (Full Implementation): Certified HSE management system (e.g. ISO 14001 / ISO 45001 certificates for Category 8.1) or fully demonstrated safety execution.
- 6 (Systematic Implementation): Solid HSE practices established with minor areas for enhancement.
- 3 (Basic Implementation): Basic awareness without systematic verification.
- 0 (No Implementation): No HSE evidence.

Category Definition: {json.dumps(category_definition, indent=2)}
Evidence Submitted:
The following JSON contains the raw extracted texts from the actual uploaded document files (under EXTRACTED_DOCUMENT_TEXTS). Treat this extracted text as the actual submitted documents/certificates.
{ev_str}
Validations: {json.dumps(validation_results, indent=2)}

Return JSON with:
- score: MUST be exactly 0, 3, 6, or 10 (no other values allowed)
- confidence: 0.0 to 1.0
- reasoning: 2-4 findings that justify the score
- evidence: for each submitted document you relied on, "<file name>: <short exact quote from it>"
- gaps: what is missing or weak (empty list if nothing)
- recommendations: concrete actions to reach score 10 (empty list if already 10)
- checks: one entry per label in ai_checks of the category definition, formatted exactly
  "<label>: TERPENUHI|SEBAGIAN|TIDAK - <evidence or reason, max 1 sentence>"
The score MUST follow score_rules of the category definition (the AI DECISION RULE of the chosen level must hold).
If the category definition has evaluator_corrections, they are past corrections by the human evaluator for this
element: apply the same reasoning when the situation is similar.

WRITING STYLE: formal Bahasa Indonesia (English technical terms are allowed), complete sentences,
no emoji, no markdown symbols (#, *, **), no bullet characters at the start of items.
Quote only text that literally appears in the submitted documents."""
        system_prompt = "You are the HSE Juror. Evaluate practical HSE safety practices and certifications objectively. You MUST return score as exactly 0, 3, 6, or 10. No other values."
        schema = {
            "type": "object",
            "properties": {
                "score": {"type": "number", "enum": [0, 3, 6, 10]},
                "confidence": {"type": "number"},
                "reasoning": {"type": "array", "items": {"type": "string"}},
                "evidence": {"type": "array", "items": {"type": "string"}},
                "gaps": {"type": "array", "items": {"type": "string"}},
                "recommendations": {"type": "array", "items": {"type": "string"}},
                "checks": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["score", "confidence", "reasoning", "evidence", "gaps", "recommendations", "checks"]
        }
        res = self.provider.generate_structured_response(prompt, schema, system_prompt)
        
        if not isinstance(res, dict) or res.get("score") is None:
            raise LLMError("Juror response has no 'score'")
        score = res["score"]
        if score not in VALID_SCORES:
            score = snap_to_csms_scale(score)
        res["score"] = score
        return res
