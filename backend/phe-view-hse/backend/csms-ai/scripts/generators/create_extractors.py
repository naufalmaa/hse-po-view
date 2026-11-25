import os

EXTRACTOR_BASE = """from typing import Dict, Any, List

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
"""

PDF_EXTRACTOR = """import fitz  # PyMuPDF
import pdfplumber
from .base_extractor import BaseExtractor
from typing import Dict, Any

class PDFExtractor(BaseExtractor):
    def extract(self, file_path: str) -> Dict[str, Any]:
        text = ""
        metadata = {"pages": 0}
        
        try:
            # 1. PyMuPDF for fast extraction
            with fitz.open(file_path) as doc:
                metadata["pages"] = len(doc)
                metadata["info"] = doc.metadata
                for page in doc:
                    text += page.get_text() + "\\n"
        except Exception as e:
            # 2. Fallback to pdfplumber
            try:
                with pdfplumber.open(file_path) as pdf:
                    metadata["pages"] = len(pdf.pages)
                    for page in pdf.pages:
                        extracted = page.extract_text()
                        if extracted:
                            text += extracted + "\\n"
            except Exception as inner_e:
                return self._create_response("pdf", {"error": str(inner_e)}, [], 0.0)

        # Basic chunking by paragraphs for 'evidence'
        evidence_chunks = [p.strip() for p in text.split('\\n\\n') if p.strip()]
        
        return self._create_response("pdf", metadata, evidence_chunks, 0.95)
"""

OCR_EXTRACTOR = """import os
from .base_extractor import BaseExtractor
from typing import Dict, Any

try:
    from paddleocr import PaddleOCR
    # Initialize globally or locally depending on memory constraints
    # ocr_model = PaddleOCR(use_angle_cls=True, lang='en')
except ImportError:
    PaddleOCR = None

class OCRExtractor(BaseExtractor):
    def __init__(self):
        if PaddleOCR:
            self.ocr_model = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)
        else:
            self.ocr_model = None

    def extract(self, file_path: str) -> Dict[str, Any]:
        if not self.ocr_model:
            return self._create_response("scanned_pdf", {"error": "PaddleOCR not installed"}, [], 0.0)
            
        evidence_chunks = []
        try:
            # PaddleOCR can handle images and pdfs natively
            result = self.ocr_model.ocr(file_path, cls=True)
            if result:
                for idx in range(len(result)):
                    res = result[idx]
                    if res:
                        page_text = " ".join([line[1][0] for line in res])
                        evidence_chunks.append(page_text)
        except Exception as e:
            return self._create_response("scanned_pdf", {"error": str(e)}, [], 0.0)

        return self._create_response("scanned_pdf", {"pages": len(evidence_chunks)}, evidence_chunks, 0.85)
"""

EXCEL_EXTRACTOR = """import pandas as pd
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
                evidence_chunks.append(f"Sheet '{sheet}':\\n{csv_str}")
                
        except Exception as e:
            return self._create_response("excel", {"error": str(e)}, [], 0.0)

        return self._create_response("excel", metadata, evidence_chunks, 0.95)
"""

WORD_EXTRACTOR = """import docx
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
"""

IMAGE_EXTRACTOR = """import os
from .base_extractor import BaseExtractor
from typing import Dict, Any

try:
    from paddleocr import PaddleOCR
except ImportError:
    PaddleOCR = None

class ImageExtractor(BaseExtractor):
    def __init__(self):
        if PaddleOCR:
            self.ocr_model = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)
        else:
            self.ocr_model = None

    def extract(self, file_path: str) -> Dict[str, Any]:
        if not self.ocr_model:
            return self._create_response("image", {"error": "PaddleOCR not installed"}, [], 0.0)
            
        evidence_chunks = []
        try:
            result = self.ocr_model.ocr(file_path, cls=True)
            if result and result[0]:
                text = " ".join([line[1][0] for line in result[0]])
                evidence_chunks.append(text)
        except Exception as e:
            return self._create_response("image", {"error": str(e)}, [], 0.0)

        return self._create_response("image", {"file": os.path.basename(file_path)}, evidence_chunks, 0.85)
"""

EXTRACTOR_ROUTER = """import os
from typing import Dict, Any
from .pdf_extractor import PDFExtractor
from .ocr_extractor import OCRExtractor
from .excel_extractor import ExcelExtractor
from .word_extractor import WordExtractor
from .image_extractor import ImageExtractor

class ExtractorRouter:
    def __init__(self):
        self.pdf = PDFExtractor()
        self.ocr = OCRExtractor()
        self.excel = ExcelExtractor()
        self.word = WordExtractor()
        self.image = ImageExtractor()

    def extract_document(self, file_path: str, use_ocr_for_pdf: bool = False) -> Dict[str, Any]:
        ext = os.path.splitext(file_path)[1].lower()
        
        if ext == '.pdf':
            if use_ocr_for_pdf:
                return self.ocr.extract(file_path)
            return self.pdf.extract(file_path)
        elif ext in ['.xlsx', '.xls']:
            return self.excel.extract(file_path)
        elif ext in ['.docx', '.doc']:
            return self.word.extract(file_path)
        elif ext in ['.jpg', '.jpeg', '.png']:
            return self.image.extract(file_path)
        else:
            return {
                "document_type": "unknown",
                "metadata": {"extension": ext},
                "evidence": [],
                "confidence": 0.0
            }
"""

def create_files():
    ext_dir = "engine/extractors"
    
    with open(os.path.join(ext_dir, "base_extractor.py"), "w", encoding="utf-8") as f:
        f.write(EXTRACTOR_BASE)
        
    with open(os.path.join(ext_dir, "pdf_extractor.py"), "w", encoding="utf-8") as f:
        f.write(PDF_EXTRACTOR)
        
    with open(os.path.join(ext_dir, "ocr_extractor.py"), "w", encoding="utf-8") as f:
        f.write(OCR_EXTRACTOR)
        
    with open(os.path.join(ext_dir, "excel_extractor.py"), "w", encoding="utf-8") as f:
        f.write(EXCEL_EXTRACTOR)
        
    with open(os.path.join(ext_dir, "word_extractor.py"), "w", encoding="utf-8") as f:
        f.write(WORD_EXTRACTOR)

    with open(os.path.join(ext_dir, "image_extractor.py"), "w", encoding="utf-8") as f:
        f.write(IMAGE_EXTRACTOR)
        
    with open(os.path.join(ext_dir, "router.py"), "w", encoding="utf-8") as f:
        f.write(EXTRACTOR_ROUTER)
        
    print("Extraction layer created successfully.")

if __name__ == "__main__":
    create_files()
