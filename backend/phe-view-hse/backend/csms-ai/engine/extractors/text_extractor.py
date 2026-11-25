import os
import json
from .base_extractor import BaseExtractor
from typing import Dict, Any

class TextExtractor(BaseExtractor):
    def extract(self, file_path: str) -> Dict[str, Any]:
        evidence_chunks = []
        metadata = {}
        ext = os.path.splitext(file_path)[1].lower()
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            if ext == '.json':
                try:
                    parsed = json.loads(content)
                    content = json.dumps(parsed, indent=2)
                except Exception:
                    pass
            evidence_chunks.append(content.strip())
            metadata["length"] = len(content)
        except Exception as e:
            return self._create_response(ext[1:], {"error": str(e)}, [], 0.0)
        return self._create_response(ext[1:] if ext else "text", metadata, evidence_chunks, 0.95)
