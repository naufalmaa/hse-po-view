from typing import List, Dict, Any
from engine.providers.provider_factory import get_provider

class EvidenceAggregator:
    def __init__(self):
        self.provider = get_provider()

    def aggregate(self, extracted_documents: List[Dict[str, Any]], required_evidence: List[str] = None) -> Dict[str, Any]:
        '''
        Aggregates evidence across multiple extracted documents.
        This uses the LLM to summarize and aggregate the findings into a clean JSON view
        to reduce context size for the scoring jurors.
        '''
        if not extracted_documents:
            return {}
            
        # In a real implementation, we would summarize Tier 3 automatically via rules,
        # and parse Tier 2, while passing Tier 1 chunks. 
        # For this prototype, we combine extracted evidence and use the LLM to summarize.
        
        doc_summaries = []
        for i, doc in enumerate(extracted_documents):
            ev_text = "\n".join([str(chunk) for chunk in doc.get('evidence', [])])
            if len(ev_text) > 50000:
                ev_text = ev_text[:50000] + "\n... [truncated for token budget]"
            doc_summaries.append(f"Doc {i+1} Type: {doc.get('document_type', 'unknown')}\nEvidence:\n{ev_text}")
            
        combined_evidence = "\n\n".join(doc_summaries)
        if len(combined_evidence) > 250000:
            combined_evidence = combined_evidence[:250000] + "\n... [remaining document evidence truncated for token budget]"
        
        # We define a dynamic schema or use a generic one
        schema = {
            "type": "object",
            "properties": {
                "key_findings": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "The most important aggregated facts from all documents"
                },
                "document_types_found": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "found_required_evidence": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of required evidence items that were found"
                },
                "missing_required_evidence": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of required evidence items that are missing"
                },
                "missing_critical_info": {
                    "type": "boolean",
                    "description": "True if standard critical HSE information seems missing"
                }
            },
            "required": ["key_findings", "document_types_found", "found_required_evidence", "missing_required_evidence", "missing_critical_info"]
        }
        
        req_text = ""
        if required_evidence:
            req_text = f"\n\nRequired Evidence Items to check against:\n- " + "\n- ".join(required_evidence)

        prompt = f"Aggregate the following extracted evidence from multiple documents:\n\n{combined_evidence}{req_text}"
        system_prompt = "You are the Evidence Aggregator Agent. Summarize and aggregate document evidence to minimize context length while preserving key facts."
        
        return self.provider.generate_structured_response(prompt, schema, system_prompt)
