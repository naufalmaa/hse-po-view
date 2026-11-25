import docx
from .base_extractor import BaseExtractor
from typing import Dict, Any

class WordExtractor(BaseExtractor):
    def extract(self, file_path: str) -> Dict[str, Any]:
        evidence_chunks = []
        metadata = {}
        
        try:
            doc = docx.Document(file_path)
            metadata["paragraphs"] = len(doc.paragraphs)
            
            for para in doc.paragraphs:
                if para.text.strip():
                    evidence_chunks.append(para.text.strip())
                    
        except Exception as e:
            return self._create_response("word", {"error": str(e)}, [], 0.0)

        return self._create_response("word", metadata, evidence_chunks, 0.95)
