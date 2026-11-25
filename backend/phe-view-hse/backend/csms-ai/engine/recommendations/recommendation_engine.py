"""
AI Recommendation Engine for CSMS Scoring

Generates actionable recommendations to help users achieve score 10 (excellent).
Uses hybrid approach: rule-based first, then LLM refinement if needed.
"""
import json
from typing import Dict, Any, List, Optional
from engine.providers.provider_factory import get_provider


class RecommendationEngine:
    """
    Generates recommendations for achieving excellent CSMS scores.
    Combines rule-based logic with LLM refinement.
    """
    
    def __init__(self, provider_role: str = "consensus_model"):
        self.provider = get_provider(role=provider_role)
    
    def generate_recommendations(
        self,
        category_id: str,
        kb: Dict[str, Any],
        evidence_record: Dict[str, Any],
        consensus_score: int,
        missing_evidence: List[str],
        juror_reasoning: List[str]
    ) -> Dict[str, Any]:
        """
        Generate recommendations for achieving score 10.
        
        Returns:
            {
                "recommendations": List[str],
                "required_documents": List[str],
                "improvement_areas": List[str],
                "priority_actions": List[str],
                "reasoning": str
            }
        """
        # Phase 1: Rule-based recommendations
        rule_based = self._generate_rule_based_recommendations(
            category_id, kb, evidence_record, consensus_score, missing_evidence
        )
        
        # Phase 2: LLM refinement if score < 10
        if consensus_score < 10 and self.provider:
            llm_refined = self._refine_with_llm(
                category_id, kb, rule_based, juror_reasoning, consensus_score
            )
            return self._merge_recommendations(rule_based, llm_refined)
        
        return rule_based
    
    def _generate_rule_based_recommendations(
        self,
        category_id: str,
        kb: Dict[str, Any],
        evidence_record: Dict[str, Any],
        consensus_score: int,
        missing_evidence: List[str]
    ) -> Dict[str, Any]:
        """Generate rule-based recommendations from KB and evidence gaps."""
        
        # Extract score_10 criteria from KB
        scoring_rules = kb.get("scoring_rules", {})
        score_10_criteria = scoring_rules.get("score_10", "")
        
        # Extract required documents from KB
        validation_rules = kb.get("validation_rules", {})
        required_documents = validation_rules.get("required_documents", [])
        
        # Generate recommendations based on score gap
        recommendations = []
        improvement_areas = []
        priority_actions = []
        
        if consensus_score == 0:
            recommendations.append("No evidence submitted. Please upload all required documents.")
            priority_actions.append("Review the required documents list and prepare submissions")
            improvement_areas.append("Document collection and submission")
            
        elif consensus_score == 3:
            recommendations.append("Evidence is incomplete or informal. Upgrade to formal documentation.")
            improvement_areas.append("Document formality and completeness")
            if missing_evidence:
                priority_actions.append(f"Address missing evidence: {', '.join(missing_evidence[:3])}")
                
        elif consensus_score == 6:
            recommendations.append("Good foundation. Add systematic implementation evidence.")
            improvement_areas.append("Systematic implementation records")
            priority_actions.append("Add audit trails and verification records")
            
        else:  # Already at 10
            recommendations.append("Excellent! Maintain current documentation standards.")
            improvement_areas.append("Continuous improvement")
            priority_actions.append("Regular review and update of documentation")
        
        # Add specific document recommendations
        if missing_evidence:
            recommendations.append(f"Upload these missing documents: {', '.join(missing_evidence[:5])}")
        
        # Add score_10 specific guidance
        if score_10_criteria:
            recommendations.append(f"For score 10: {score_10_criteria[:200]}")
        
        return {
            "recommendations": recommendations,
            "required_documents": missing_evidence if missing_evidence else required_documents,
            "improvement_areas": improvement_areas,
            "priority_actions": priority_actions,
            "reasoning": f"Rule-based analysis: score {consensus_score}/10, {len(missing_evidence)} missing items"
        }
    
    def _refine_with_llm(
        self,
        category_id: str,
        kb: Dict[str, Any],
        rule_based: Dict[str, Any],
        juror_reasoning: List[str],
        consensus_score: int
    ) -> Dict[str, Any]:
        """Refine recommendations using LLM for contextual insights."""
        
        prompt = f"""You are a CSMS (Contractor Safety Management System) expert advisor.

Context:
- Category: {category_id}
- Current Score: {consensus_score}/10
- Juror Reasoning: {json.dumps(juror_reasoning, indent=2)[:1000]}

Rule-Based Recommendations (to refine):
{json.dumps(rule_based, indent=2)}

Task:
Provide 3-5 specific, actionable recommendations to achieve score 10 (excellent).
Focus on:
1. What specific documents to upload
2. What evidence format is required
3. What systematic implementation records are needed
4. Priority actions (most impactful first)

Return JSON with:
{{
  "llm_recommendations": ["specific actionable item 1", "item 2", ...],
  "priority_documents": ["document name 1", "document name 2", ...],
  "key_improvements": ["improvement 1", "improvement 2", ...],
  "reasoning": "brief explanation"
}}
"""
        
        try:
            response = self.provider.generate_structured_response(
                prompt=prompt,
                schema={
                    "type": "object",
                    "properties": {
                        "llm_recommendations": {"type": "array", "items": {"type": "string"}},
                        "priority_documents": {"type": "array", "items": {"type": "string"}},
                        "key_improvements": {"type": "array", "items": {"type": "string"}},
                        "reasoning": {"type": "string"}
                    },
                    "required": ["llm_recommendations", "priority_documents", "key_improvements", "reasoning"]
                },
                system_prompt="You are a CSMS expert advisor. Provide specific, actionable recommendations."
            )
            return response
        except Exception as e:
            return {
                "llm_recommendations": [],
                "priority_documents": [],
                "key_improvements": [],
                "reasoning": f"LLM refinement failed: {str(e)}"
            }
    
    def _merge_recommendations(
        self,
        rule_based: Dict[str, Any],
        llm_refined: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Merge rule-based and LLM recommendations."""
        
        merged_recommendations = rule_based.get("recommendations", [])
        merged_recommendations.extend(llm_refined.get("llm_recommendations", []))
        
        # Remove duplicates while preserving order
        seen = set()
        unique_recommendations = []
        for rec in merged_recommendations:
            if rec not in seen:
                seen.add(rec)
                unique_recommendations.append(rec)
        
        # Merge required documents
        required_docs = rule_based.get("required_documents", [])
        priority_docs = llm_refined.get("priority_documents", [])
        all_docs = list(dict.fromkeys(required_docs + priority_docs))  # Preserve order, remove dupes
        
        # Merge improvement areas
        improvements = rule_based.get("improvement_areas", [])
        improvements.extend(llm_refined.get("key_improvements", []))
        unique_improvements = list(dict.fromkeys(improvements))
        
        return {
            "recommendations": unique_recommendations[:10],  # Limit to top 10
            "required_documents": all_docs[:10],
            "improvement_areas": unique_improvements[:5],
            "priority_actions": rule_based.get("priority_actions", [])[:5],
            "reasoning": f"{rule_based.get('reasoning', '')} | LLM: {llm_refined.get('reasoning', '')}"
        }
