import os
import json
import time
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
from .vision_extractor import VisionExtractor
from . import page_ocr

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
        self.vision = VisionExtractor(role="vision_model")

        # Load runtime config
        self.vision_enabled = True
        self.ocr_enabled = True
        config_path = os.path.join(os.path.dirname(__file__), "..", "..", "configs", "runtime_config.json")
        if os.path.exists(config_path):
            try:
                with open(config_path, "r", encoding="utf-8") as f:
                    cfg = json.load(f)
                    self.vision_enabled = cfg.get("vision_enabled", True)
                    self.ocr_enabled = cfg.get("ocr_enabled", True)
            except Exception:
                pass

    # "thorough" (default) reads whole documents; "fast" reads only the important parts (set per run)
    profile = "thorough"

    @staticmethod
    def important_pages(page_texts):
        """Fast mode: first 3 pages, the last page and up to 6 pages that look like approvals/certificates."""
        import re as _re
        n = len(page_texts)
        keep = set(range(min(3, n))) | ({n - 1} if n else set())
        pat = _re.compile(r"disahkan|approved|tanda tangan|signature|mengetahui|menyetujui|sertifikat|certificate|berlaku|valid", _re.I)
        extra = [i for i, t in enumerate(page_texts) if i not in keep and pat.search(t or "")]
        return sorted(keep | set(extra[:6]))

    @staticmethod
    def sniff(file_path: str) -> str:
        """File kind from its first bytes, falling back to the extension. Uploads often have no or a wrong
        extension (125 such files in prod), and .docx/.xlsx/.pptx are ZIP containers."""
        ext = os.path.splitext(file_path)[1].lower().lstrip(".")
        try:
            with open(file_path, "rb") as f:
                head = f.read(8)
        except OSError:
            return ext
        if head.startswith(b"%PDF"):
            return "pdf"
        if head.startswith(b"Rar!"):
            return "rar"
        if head.startswith(b"7z\xbc\xaf\x27\x1c"):
            return "7z"
        if head.startswith(b"\x89PNG"):
            return "png"
        if head.startswith(b"\xff\xd8\xff"):
            return "jpg"
        if head.startswith(b"PK\x03\x04"):
            if ext in ("docx", "xlsx", "pptx"):
                return ext
            try:
                import zipfile
                names = zipfile.ZipFile(file_path).namelist()
                if any(n.startswith("word/") for n in names):
                    return "docx"
                if any(n.startswith("xl/") for n in names):
                    return "xlsx"
                if any(n.startswith("ppt/") for n in names):
                    return "pptx"
            except Exception:
                pass
            return "zip"
        return ext

    def extract_document(self, file_path: str, use_ocr_for_pdf: bool = False) -> Dict[str, Any]:
        start_time = time.time()
        kind = self.sniff(file_path)
        ext = "." + kind if kind else os.path.splitext(file_path)[1].lower()
        extractor_used = "unknown"
        ocr_used = False
        vision_model_used = "none"
        ocr_confidence = 1.0
        vision_confidence = 0.0
        warnings = []
        errors = []

        try:
            if ext == '.pdf':
                # Step 1: Always try high-speed native PDF text extraction first
                base_res = self.pdf.extract(file_path)
                extractor_used = "PDFExtractor"
                chars_found = sum(len(str(c)) for c in base_res.get("evidence", []))
                
                # Step 2: pages without a text layer (scans) -> qwen3-vl, fallback PaddleOCR; long scans capped
                meta = base_res.get("metadata", {})
                page_texts = meta.pop("page_texts", [])
                scanned = meta.get("scanned_pages", [])
                if use_ocr_for_pdf:
                    scanned = list(range(len(page_texts)))
                fast = self.profile == "fast"
                if fast and page_texts:
                    keep = set(self.important_pages(page_texts))
                    page_texts = [t if i in keep else "" for i, t in enumerate(page_texts)]
                    scanned = [i for i in scanned if i in keep]
                    base_res["evidence"] = [f"[Hal. {i + 1}] {t.strip()}" for i, t in enumerate(page_texts) if len(t.strip()) >= 40]
                if self.ocr_enabled and scanned:
                    allowed = set(page_ocr.pages_to_ocr(len(page_texts)))
                    if fast:
                        allowed = set(sorted(scanned)[:3])  # fast: at most 3 scanned pages per PDF
                    todo = [i for i in scanned if i in allowed]
                    skipped = len(scanned) - len(todo)
                    methods = []
                    ocr_pages = set()
                    for i, text, method in page_ocr.ocr_pdf_pages(file_path, todo):
                        methods.append(method)
                        if text:
                            page_texts[i] = text
                            ocr_pages.add(i)
                    evidence = [f"[Hal. {i + 1}] {t.strip()}" for i, t in enumerate(page_texts)
                                if t.strip() and (i in ocr_pages or len(t.strip()) >= 40)]
                    base_res["evidence"] = evidence
                    ocr_used = any(m != "none" for m in methods)
                    extractor_used = "PDFExtractor+OCR" if ocr_used else "PDFExtractor"
                    meta["ocr_methods"] = {m: methods.count(m) for m in set(methods)}
                    if skipped:
                        warnings.append(f"{skipped} halaman scan tidak di-OCR (batas {page_ocr.OCR_FIRST_PAGES}+{page_ocr.OCR_LAST_PAGES} halaman)")
                    if methods and not ocr_used:
                        errors.append("PDF hasil scan tidak dapat dibaca (vision dan OCR gagal)")
            elif ext in ['.xlsx', '.xls']:
                base_res = self.excel.extract(file_path)
                extractor_used = "ExcelExtractor"
            elif ext in ['.docx', '.doc']:
                base_res = self.word.extract(file_path)
                extractor_used = "WordExtractor"
            elif ext in ['.jpg', '.jpeg', '.png', '.bmp', '.tif', '.tiff', '.gif', '.jpe', '.webp']:
                text, method = page_ocr.ocr_image_file(file_path)
                base_res = {"evidence": [text] if text else [], "metadata": {"pages": 1, "ocr_method": method}, "confidence": 0.85 if text else 0.0}
                extractor_used = f"ImageOCR({method})"
                ocr_used = method != "none"
                if not text:
                    errors.append("gambar tidak dapat dibaca (vision dan OCR gagal)")
            elif ext == '.csv':
                base_res = self.csv.extract(file_path)
                extractor_used = "CSVExtractor"
            elif ext in ['.txt', '.xml', '.json']:
                base_res = self.text.extract(file_path)
                extractor_used = "TextExtractor"
            elif ext == '.msg':
                base_res = self.msg.extract(file_path)
                extractor_used = "MSGExtractor"
            elif ext in ['.ppt', '.pptx']:
                base_res = self.ppt.extract(file_path)
                extractor_used = "PPTExtractor"
            elif ext in ['.zip', '.rar', '.7z']:
                base_res = self.archive.extract(file_path, kind=kind)
                extractor_used = "ArchiveExtractor"
                if base_res.get("metadata", {}).get("error"):
                    errors.append(base_res["metadata"]["error"])
            else:
                return {
                    "status": "unknown_document",
                    "document_type": "unknown",
                    "extension": ext,
                    "reason": "unsupported format",
                    "metadata": {"extension": ext},
                    "evidence": [],
                    "confidence": 0.0,
                    "extractor_used": "none",
                    "vision_model_used": "none",
                    "ocr_used": False,
                    "pages": 0,
                    "pages_extracted": 0,
                    "characters_extracted": 0,
                    "estimated_characters": 0,
                    "coverage_pct": 0.0,
                    "ocr_confidence": 0.0,
                    "vision_confidence": 0.0,
                    "extraction_latency": round(time.time() - start_time, 3),
                    "extraction_success": False,
                    "warnings": ["unsupported format"],
                    "errors": []
                }
        except Exception as e:
            return {
                "status": "error",
                "document_type": "error",
                "extension": ext,
                "reason": str(e),
                "metadata": {"error": str(e)},
                "evidence": [],
                "confidence": 0.0,
                "extractor_used": extractor_used,
                "vision_model_used": "none",
                "ocr_used": ocr_used,
                "pages": 0,
                "pages_extracted": 0,
                "characters_extracted": 0,
                "estimated_characters": 0,
                "coverage_pct": 0.0,
                "ocr_confidence": 0.0,
                "vision_confidence": 0.0,
                "extraction_latency": round(time.time() - start_time, 3),
                "extraction_success": False,
                "warnings": [],
                "errors": [str(e)]
            }

        # Calculate character stats and pages
        evidence_list = base_res.get("evidence", [])
        chars_extracted = sum(len(str(c)) for c in evidence_list)
        meta = base_res.get("metadata", {})
        pages = meta.get("pages", 1) or 1
        pages_extracted = pages
        estimated_chars = max(chars_extracted, pages * 1500)
        coverage_pct = round((chars_extracted / estimated_chars) * 100, 1) if estimated_chars > 0 else 100.0

        # Enhance with Vision LLM if enabled
        structured_info = {}
        
        # Skip Vision LLM for text-heavy PDFs to drastically improve speed and reduce text hallucination
        skip_vision = True
        
        if self.vision_enabled and ext in ['.pdf', '.jpg', '.jpeg', '.png', '.tif', '.tiff'] and not skip_vision:
            try:
                vis_out = self.vision.extract(file_path, ocr_output=evidence_list, metadata=meta)
                vision_model_used = getattr(self.vision.provider, "model", "Qwen/Qwen3-VL-8B-Instruct")
                vision_confidence = vis_out.get("confidence", 0.93)
                structured_info = vis_out
                if vis_out.get("evidence"):
                    evidence_list = list(dict.fromkeys(evidence_list + vis_out["evidence"]))
                if vis_out.get("warning"):
                    warnings.append(vis_out["warning"])
            except Exception as ve:
                warnings.append(f"Vision extraction warning: {ve}")

        latency = round(time.time() - start_time, 3)
        return {
            "status": "ok",
            "document_type": base_res.get("document_type", "Document"),
            "metadata": meta,
            "evidence": evidence_list,
            "confidence": base_res.get("confidence", 0.93),
            "extractor_used": extractor_used,
            "vision_model_used": vision_model_used,
            "ocr_used": ocr_used,
            "pages": pages,
            "pages_extracted": pages_extracted,
            "characters_extracted": chars_extracted,
            "estimated_characters": estimated_chars,
            "coverage_pct": coverage_pct,
            "ocr_confidence": ocr_confidence,
            "vision_confidence": vision_confidence,
            "extraction_latency": latency,
            "extraction_success": True,
            "warnings": warnings,
            "errors": errors,
            "structured": structured_info
        }
