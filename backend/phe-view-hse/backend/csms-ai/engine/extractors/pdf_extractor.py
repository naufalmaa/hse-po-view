import fitz  # PyMuPDF
import pdfplumber
from .base_extractor import BaseExtractor
from typing import Dict, Any, List

# A page with less text than this has no usable text layer (scan): the router OCRs it.
MIN_PAGE_TEXT = 40


class PDFExtractor(BaseExtractor):
    def extract(self, file_path: str) -> Dict[str, Any]:
        pages: List[str] = []
        metadata: Dict[str, Any] = {"pages": 0}

        try:
            # 1. PyMuPDF for fast extraction, one text per page (reading order)
            with fitz.open(file_path) as doc:
                metadata["pages"] = len(doc)
                metadata["info"] = doc.metadata
                for page in doc:
                    blocks = page.get_text("blocks")
                    blocks.sort(key=lambda b: (b[1], b[0]))
                    pages.append("\n".join(b[4].strip() for b in blocks if b[4].strip()))
        except Exception:
            # 2. Fallback to pdfplumber
            try:
                with pdfplumber.open(file_path) as pdf:
                    metadata["pages"] = len(pdf.pages)
                    pages = [(p.extract_text() or "") for p in pdf.pages]
            except Exception as inner_e:
                return self._create_response("pdf", {"error": str(inner_e)}, [], 0.0)

        # pages without a usable text layer -> OCR candidates (handled by the router)
        metadata["scanned_pages"] = [i for i, t in enumerate(pages) if len(t.strip()) < MIN_PAGE_TEXT]
        metadata["page_texts"] = pages
        evidence_chunks = [f"[Hal. {i + 1}] {t.strip()}" for i, t in enumerate(pages) if len(t.strip()) >= MIN_PAGE_TEXT]
        return self._create_response("pdf", metadata, evidence_chunks, 0.95)
