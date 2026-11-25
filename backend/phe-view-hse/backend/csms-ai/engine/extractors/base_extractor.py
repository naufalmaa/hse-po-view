from typing import Dict, Any, List

class BaseExtractor:
    def extract(self, file_path: str) -> Dict[str, Any]:
        raise NotImplementedError
        
    def _create_response(self, doc_type: str, metadata: Dict[str, Any], evidence: List[str], confidence: float = 0.95) -> Dict[str, Any]:
        return {
            "document_type": doc_type,
            "metadata": metadata,
            "evidence": evidence,
            "confidence": confidence
        }
