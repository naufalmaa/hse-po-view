import os

DOCUMENT_CLASSIFIER = """import os
from typing import Dict, Any

class DocumentClassifier:
    # A simple deterministic rule-based classifier based on filenames and keywords.
    # In a full implementation, this could use a lightweight LLM classification if needed.
    
    def classify(self, file_path: str, metadata: Dict[str, Any]) -> str:
        filename = os.path.basename(file_path).lower()
        
        # Tier 1 keywords
        if any(kw in filename for kw in ["plan", "manual", "procedure", "risk", "erp", "audit", "management review", "sop"]):
            return "Tier 1: Deep Analysis"
            
        # Tier 2 keywords
        if any(kw in filename for kw in ["matrix", "attendance", "register", "record", "list"]):
            return "Tier 2: Structured Document"
            
        # Tier 3 keywords
        if any(kw in filename for kw in ["cert", "license", "qualification", "cv", "resume", "id"]):
            return "Tier 3: Mass Evidence"
            
        return "Unclassified"
"""

PRIORITY_ASSIGNER = """from typing import Dict, Any

class PriorityAssigner:
    def assign_priority(self, classification: str) -> int:
        if "Tier 1" in classification:
            return 1 # Highest priority - deep analysis
        elif "Tier 2" in classification:
            return 2 # Medium priority - structured parsing
        elif "Tier 3" in classification:
            return 3 # Low priority - metadata aggregation
        return 4 # Lowest priority / Unknown
"""

EVIDENCE_AGGREGATOR = """from typing import List, Dict, Any
from engine.providers.provider_factory import get_provider

class EvidenceAggregator:
    def __init__(self):
        self.provider = get_provider()

    def aggregate(self, extracted_documents: List[Dict[str, Any]]) -> Dict[str, Any]:
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
        
        combined_evidence = "\\n\\n".join([
            f"Doc {i+1} Type: {doc['document_type']}\\nEvidence:\\n" + "\\n".join(doc['evidence'])
            for i, doc in enumerate(extracted_documents)
        ])
        
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
                "missing_critical_info": {
                    "type": "boolean",
                    "description": "True if standard critical HSE information seems missing"
                }
            },
            "required": ["key_findings", "document_types_found", "missing_critical_info"]
        }
        
        prompt = f"Aggregate the following extracted evidence from multiple documents:\\n\\n{combined_evidence}"
        system_prompt = "You are the Evidence Aggregator Agent. Summarize and aggregate document evidence to minimize context length while preserving key facts."
        
        return self.provider.generate_structured_response(prompt, schema, system_prompt)
"""

def create_files():
    agg_dir = "engine/aggregators"
    
    with open(os.path.join(agg_dir, "document_classifier.py"), "w", encoding="utf-8") as f:
        f.write(DOCUMENT_CLASSIFIER)
        
    with open(os.path.join(agg_dir, "priority_assigner.py"), "w", encoding="utf-8") as f:
        f.write(PRIORITY_ASSIGNER)
        
    with open(os.path.join(agg_dir, "evidence_aggregator.py"), "w", encoding="utf-8") as f:
        f.write(EVIDENCE_AGGREGATOR)
        
    print("Evidence Aggregation Layer created successfully.")

if __name__ == "__main__":
    create_files()
