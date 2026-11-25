import pandas as pd
from .base_extractor import BaseExtractor
from typing import Dict, Any

class CSVExtractor(BaseExtractor):
    def extract(self, file_path: str) -> Dict[str, Any]:
        evidence_chunks = []
        metadata = {}
        try:
            df = pd.read_csv(file_path, on_bad_lines='skip')
            metadata["rows"] = len(df)
            metadata["columns"] = list(df.columns)
            csv_str = df.to_csv(index=False)
            evidence_chunks.append(f"CSV Content:\n{csv_str}")
        except Exception as e:
            return self._create_response("csv", {"error": str(e)}, [], 0.0)
        return self._create_response("csv", metadata, evidence_chunks, 0.95)
