import os
from .base_extractor import BaseExtractor
from typing import Dict, Any
from .ocr_singleton import get_shared_ocr
from .pdf_extractor import PDFExtractor

class OCRExtractor(BaseExtractor):
    def __init__(self):
        self.ocr_model = None
        self.pdf_extractor = PDFExtractor()

    def extract(self, file_path: str) -> Dict[str, Any]:
        ext = os.path.splitext(file_path)[1].lower()
        
        # For PDF files, always attempt high-speed PyMuPDF text extraction first
        if ext == '.pdf':
            try:
                pdf_res = self.pdf_extractor.extract(file_path)
                evidence_list = pdf_res.get("evidence", [])
                chars_found = sum(len(str(c)) for c in evidence_list)
                if chars_found > 50:
                    return self._create_response("scanned_pdf", pdf_res.get("metadata", {}), evidence_list, 0.95)
            except Exception:
                pass

        # Try PaddleOCR if available
        evidence_chunks = []
        try:
            os.environ["FLAGS_use_mkldnn"] = "0"
            if not self.ocr_model:
                self.ocr_model = get_shared_ocr()
            if self.ocr_model:
                result = self.ocr_model.ocr(file_path)
                if result:
                    for idx in range(len(result)):
                        res = result[idx]
                        if res:
                            page_text = " ".join([line[1][0] for line in res])
                            evidence_chunks.append(page_text)
        except Exception as e:
            # If PaddleOCR crashes (e.g. OneDNN PirAttribute error on Windows), fallback gracefully
            pass

        # If still empty for PDF, ensure we fallback to PyMuPDF result even if short
        if not evidence_chunks and ext == '.pdf':
            try:
                pdf_res = self.pdf_extractor.extract(file_path)
                evidence_chunks = pdf_res.get("evidence", [])
            except Exception:
                pass

        pages = len(evidence_chunks) or 1
        confidence = 0.88 if evidence_chunks else 0.0
        return self._create_response("scanned_pdf", {"pages": pages}, evidence_chunks, confidence)
