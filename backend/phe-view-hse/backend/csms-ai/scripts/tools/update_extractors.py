import os

CSV_EXTRACTOR = """import pandas as pd
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
            evidence_chunks.append(f"CSV Content:\\n{csv_str}")
        except Exception as e:
            return self._create_response("csv", {"error": str(e)}, [], 0.0)
        return self._create_response("csv", metadata, evidence_chunks, 0.95)
"""

TEXT_EXTRACTOR = """import os
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
"""

MSG_EXTRACTOR = """import os
import tempfile
import shutil
from .base_extractor import BaseExtractor
from typing import Dict, Any, TYPE_CHECKING

if TYPE_CHECKING:
    from .router import ExtractorRouter

try:
    import extract_msg
except ImportError:
    extract_msg = None

class MSGExtractor(BaseExtractor):
    def __init__(self, router: 'ExtractorRouter' = None):
        self.router = router

    def extract(self, file_path: str) -> Dict[str, Any]:
        if not extract_msg:
            return self._create_response("msg", {"error": "extract_msg package not installed"}, [], 0.0)
        evidence_chunks = []
        metadata = {}
        temp_dir = None
        try:
            msg = extract_msg.Message(file_path)
            subject = msg.subject or ""
            sender = msg.sender or ""
            recipients = msg.to or ""
            body = msg.body or ""
            
            metadata["subject"] = subject
            metadata["sender"] = sender
            metadata["recipients"] = recipients
            
            header_text = f"Subject: {subject}\\nFrom: {sender}\\nTo: {recipients}\\n\\nBody:\\n{body}"
            evidence_chunks.append(header_text.strip())
            
            # Process attachments
            if msg.attachments and self.router:
                temp_dir = tempfile.mkdtemp(prefix="msg_att_")
                for att in msg.attachments:
                    try:
                        att_path = att.save(customPath=temp_dir)
                        if att_path and os.path.exists(att_path):
                            att_res = self.router.extract_document(att_path)
                            if att_res.get("evidence"):
                                evidence_chunks.extend([f"Attachment ({os.path.basename(att_path)}): {ev}" for ev in att_res["evidence"]])
                    except Exception as att_e:
                        evidence_chunks.append(f"Attachment error: {str(att_e)}")
            msg.close()
        except Exception as e:
            return self._create_response("msg", {"error": str(e)}, [], 0.0)
        finally:
            if temp_dir and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)
        return self._create_response("msg", metadata, evidence_chunks, 0.90)
"""

PPT_EXTRACTOR = """import os
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
                    evidence_chunks.append(f"Slide {idx}:\\n" + "\\n".join(slide_text))
        except Exception as e:
            return self._create_response("presentation", {"error": str(e)}, [], 0.0)
        return self._create_response("presentation", metadata, evidence_chunks, 0.90)
"""

ARCHIVE_EXTRACTOR = """import os
import tempfile
import shutil
import zipfile
from .base_extractor import BaseExtractor
from typing import Dict, Any, TYPE_CHECKING

if TYPE_CHECKING:
    from .router import ExtractorRouter

try:
    import rarfile
except ImportError:
    rarfile = None

try:
    import py7zr
except ImportError:
    py7zr = None

class ArchiveExtractor(BaseExtractor):
    def __init__(self, router: 'ExtractorRouter' = None):
        self.router = router

    def extract(self, file_path: str, current_depth: int = 1, max_depth: int = 3) -> Dict[str, Any]:
        if current_depth > max_depth:
            return self._create_response("archive", {"reason": "max recursion depth reached"}, [], 0.0)
            
        evidence_chunks = []
        metadata = {"files_extracted": 0}
        temp_dir = None
        ext = os.path.splitext(file_path)[1].lower()
        
        try:
            temp_dir = tempfile.mkdtemp(prefix="archive_ext_")
            if ext == '.zip':
                with zipfile.ZipFile(file_path, 'r') as zf:
                    zf.extractall(temp_dir)
            elif ext == '.rar':
                if not rarfile:
                    return self._create_response("archive", {"error": "rarfile package not installed"}, [], 0.0)
                with rarfile.RarFile(file_path, 'r') as rf:
                    rf.extractall(temp_dir)
            elif ext == '.7z':
                if not py7zr:
                    return self._create_response("archive", {"error": "py7zr package not installed"}, [], 0.0)
                with py7zr.SevenZipFile(file_path, 'r') as szf:
                    szf.extractall(temp_dir)
            else:
                return self._create_response("archive", {"error": f"unsupported archive ext {ext}"}, [], 0.0)
                
            # Process recursively
            if self.router:
                for root, _, files in os.walk(temp_dir):
                    for file in files:
                        sub_path = os.path.join(root, file)
                        sub_ext = os.path.splitext(sub_path)[1].lower()
                        metadata["files_extracted"] += 1
                        if sub_ext in ['.zip', '.rar', '.7z']:
                            sub_res = self.extract(sub_path, current_depth + 1, max_depth)
                        else:
                            sub_res = self.router.extract_document(sub_path)
                        if sub_res.get("evidence"):
                            evidence_chunks.extend([f"[{file}] {ev}" for ev in sub_res["evidence"]])
        except Exception as e:
            return self._create_response("archive", {"error": str(e)}, [], 0.0)
        finally:
            if temp_dir and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)
                
        return self._create_response("archive", metadata, evidence_chunks, 0.85)
"""

ROUTER_CODE = """import os
from typing import Dict, Any
from .pdf_extractor import PDFExtractor
from .ocr_extractor import OCRExtractor
from .excel_extractor import ExcelExtractor
from .word_extractor import WordExtractor
from .image_extractor import ImageExtractor
from .csv_extractor import CSVExtractor
from .text_extractor import TextExtractor
from .msg_extractor import MSGExtractor
from .ppt_extractor import PPTExtractor
from .archive_extractor import ArchiveExtractor

class ExtractorRouter:
    def __init__(self):
        self.pdf = PDFExtractor()
        self.ocr = OCRExtractor()
        self.excel = ExcelExtractor()
        self.word = WordExtractor()
        self.image = ImageExtractor()
        self.csv = CSVExtractor()
        self.text = TextExtractor()
        self.msg = MSGExtractor(self)
        self.ppt = PPTExtractor()
        self.archive = ArchiveExtractor(self)

    def extract_document(self, file_path: str, use_ocr_for_pdf: bool = False) -> Dict[str, Any]:
        ext = os.path.splitext(file_path)[1].lower()
        
        try:
            if ext == '.pdf':
                if use_ocr_for_pdf:
                    return self.ocr.extract(file_path)
                return self.pdf.extract(file_path)
            elif ext in ['.xlsx', '.xls']:
                return self.excel.extract(file_path)
            elif ext in ['.docx', '.doc']:
                return self.word.extract(file_path)
            elif ext in ['.jpg', '.jpeg', '.png', '.bmp', '.tif', '.tiff', '.gif']:
                return self.image.extract(file_path)
            elif ext == '.csv':
                return self.csv.extract(file_path)
            elif ext in ['.txt', '.xml', '.json']:
                return self.text.extract(file_path)
            elif ext == '.msg':
                return self.msg.extract(file_path)
            elif ext in ['.ppt', '.pptx']:
                return self.ppt.extract(file_path)
            elif ext in ['.zip', '.rar', '.7z']:
                return self.archive.extract(file_path)
            else:
                return {
                    "status": "unknown_document",
                    "document_type": "unknown",
                    "extension": ext,
                    "reason": "unsupported format",
                    "metadata": {"extension": ext},
                    "evidence": [],
                    "confidence": 0.0
                }
        except Exception as e:
            return {
                "status": "error",
                "document_type": "error",
                "extension": ext,
                "reason": str(e),
                "metadata": {"error": str(e)},
                "evidence": [],
                "confidence": 0.0
            }
"""

def main():
    ext_dir = os.path.join("engine", "extractors")
    os.makedirs(ext_dir, exist_ok=True)
    with open(os.path.join(ext_dir, "csv_extractor.py"), "w", encoding="utf-8") as f:
        f.write(CSV_EXTRACTOR)
    with open(os.path.join(ext_dir, "text_extractor.py"), "w", encoding="utf-8") as f:
        f.write(TEXT_EXTRACTOR)
    with open(os.path.join(ext_dir, "msg_extractor.py"), "w", encoding="utf-8") as f:
        f.write(MSG_EXTRACTOR)
    with open(os.path.join(ext_dir, "ppt_extractor.py"), "w", encoding="utf-8") as f:
        f.write(PPT_EXTRACTOR)
    with open(os.path.join(ext_dir, "archive_extractor.py"), "w", encoding="utf-8") as f:
        f.write(ARCHIVE_EXTRACTOR)
    with open(os.path.join(ext_dir, "router.py"), "w", encoding="utf-8") as f:
        f.write(ROUTER_CODE)
    print("Extractors and router updated successfully.")

if __name__ == "__main__":
    main()
