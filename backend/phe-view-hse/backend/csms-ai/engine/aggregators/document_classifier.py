import os
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
