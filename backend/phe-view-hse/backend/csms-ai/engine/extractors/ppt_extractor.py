import os
from .base_extractor import BaseExtractor
from typing import Dict, Any

try:
    from pptx import Presentation
except ImportError:
    Presentation = None

class PPTExtractor(BaseExtractor):
    def extract(self, file_path: str) -> Dict[str, Any]:
        if not Presentation:
            return self._create_response("presentation", {"error": "python-pptx not installed"}, [], 0.0)
        evidence_chunks = []
        metadata = {"slides": 0}
        try:
            prs = Presentation(file_path)
            metadata["slides"] = len(prs.slides)
            for idx, slide in enumerate(prs.slides, 1):
                slide_text = []
                for shape in slide.shapes:
                    if shape.has_text_frame:
                        for paragraph in shape.text_frame.paragraphs:
                            if paragraph.text.strip():
                                slide_text.append(paragraph.text.strip())
                    elif shape.has_table:
                        for row in shape.table.rows:
                            row_text = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                            if row_text:
                                slide_text.append(" | ".join(row_text))
                if slide_text:
                    evidence_chunks.append(f"Slide {idx}:\n" + "\n".join(slide_text))
        except Exception as e:
            return self._create_response("presentation", {"error": str(e)}, [], 0.0)
        return self._create_response("presentation", metadata, evidence_chunks, 0.90)
