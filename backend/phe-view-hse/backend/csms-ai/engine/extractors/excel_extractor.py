import pandas as pd
from .base_extractor import BaseExtractor
from typing import Dict, Any

class ExcelExtractor(BaseExtractor):
    def extract(self, file_path: str) -> Dict[str, Any]:
        evidence_chunks = []
        metadata = {}
        
        try:
            xl = pd.ExcelFile(file_path)
            metadata["sheets"] = xl.sheet_names
            
            for sheet in xl.sheet_names:
                df = xl.parse(sheet)
                # Convert to JSON or CSV string representation as evidence
                csv_str = df.to_csv(index=False)
                evidence_chunks.append(f"Sheet '{sheet}':\n{csv_str}")
                
        except Exception as e:
            return self._create_response("excel", {"error": str(e)}, [], 0.0)

        return self._create_response("excel", metadata, evidence_chunks, 0.95)
