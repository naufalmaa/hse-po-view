"""Text from scanned pages and images.

Order (decided Nov 2026): the vision model qwen3-vl (vLLM, GPU) first because it gives the cleanest text;
when it fails or times out, PaddleOCR on the CPU. Both run per page, a few pages in parallel.
"""
import base64
import os
import threading
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional, Tuple

import requests

try:
    import fitz  # PyMuPDF
except ImportError:  # pragma: no cover
    fitz = None

VISION_TIMEOUT = int(os.getenv("CSMS_AI_VISION_TIMEOUT", "60"))
VISION_PARALLEL = int(os.getenv("CSMS_AI_VISION_PARALLEL", "4"))
OCR_DPI = int(os.getenv("CSMS_AI_OCR_DPI", "130"))
# Pages OCR'ed per PDF: the first N and the last M (long scans are usually forms + attachments)
OCR_FIRST_PAGES = int(os.getenv("CSMS_AI_OCR_FIRST_PAGES", "55"))
OCR_LAST_PAGES = int(os.getenv("CSMS_AI_OCR_LAST_PAGES", "5"))
# A page with less text than this is treated as scanned
MIN_PAGE_TEXT = int(os.getenv("CSMS_AI_MIN_PAGE_TEXT", "40"))

PROMPT = (
    "Transcribe all text in this scanned document page verbatim (Indonesian/English), including tables "
    "(one row per line, cells separated by ' | '), stamps, signatures' names and handwritten dates. "
    "Output plain text only, no commentary."
)

_paddle = None
_paddle_lock = threading.Lock()
_paddle_failed = False


def _vision_config() -> Tuple[Optional[str], Optional[str]]:
    try:
        from engine.providers.provider_factory import get_provider
        p = get_provider(role="vision_model")
        return getattr(p, "chat_url", None), getattr(p, "model", None)
    except Exception:
        return None, None


def _vision_text(png: bytes) -> str:
    url, model = _vision_config()
    if not url:
        raise RuntimeError("vision model not configured")
    payload = {
        "model": model,
        "max_tokens": 2000,
        "temperature": 0,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": PROMPT},
                {"type": "image_url", "image_url": {"url": "data:image/png;base64," + base64.b64encode(png).decode()}},
            ],
        }],
    }
    r = requests.post(url, json=payload, timeout=VISION_TIMEOUT)
    r.raise_for_status()
    text = (r.json().get("choices") or [{}])[0].get("message", {}).get("content") or ""
    return text.strip()


def _paddle_text(png: bytes) -> str:
    """PaddleOCR 3.x: oneDNN off (crashes on Windows), 'rec_texts' result format, small mobile models."""
    global _paddle, _paddle_failed
    if _paddle_failed:
        return ""
    import numpy as np
    with _paddle_lock:  # the model is not thread-safe
        if _paddle is None:
            try:
                os.environ.setdefault("FLAGS_use_mkldnn", "0")
                from paddleocr import PaddleOCR
                _paddle = PaddleOCR(
                    lang="en",
                    enable_mkldnn=False,
                    use_doc_orientation_classify=False,
                    use_doc_unwarping=False,
                    use_textline_orientation=False,
                    text_detection_model_name="PP-OCRv5_mobile_det",
                    text_recognition_model_name="PP-OCRv5_mobile_rec",
                )
            except Exception as e:
                print(f"[OCR] PaddleOCR unavailable: {e}")
                _paddle_failed = True
                return ""
        with fitz.open(stream=png, filetype="png") as d:
            pix = d[0].get_pixmap()
        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3]
        res = _paddle.predict(img)
        return " ".join(" ".join(p.get("rec_texts", [])) for p in res).strip()


def ocr_png(png: bytes) -> Tuple[str, str]:
    """(text, method). method: 'vision' | 'paddleocr' | 'none'."""
    try:
        t = _vision_text(png)
        if t:
            return t, "vision"
    except Exception as e:
        print(f"[OCR] vision failed ({type(e).__name__}: {str(e)[:120]}), falling back to PaddleOCR")
    try:
        t = _paddle_text(png)
        if t:
            return t, "paddleocr"
    except Exception as e:
        print(f"[OCR] PaddleOCR failed: {type(e).__name__}: {str(e)[:120]}")
    return "", "none"


def pages_to_ocr(n_pages: int) -> List[int]:
    if n_pages <= OCR_FIRST_PAGES + OCR_LAST_PAGES:
        return list(range(n_pages))
    return list(range(OCR_FIRST_PAGES)) + list(range(n_pages - OCR_LAST_PAGES, n_pages))


def ocr_pdf_pages(path: str, page_indices: List[int]) -> List[Tuple[int, str, str]]:
    """OCR the given pages in parallel -> [(page_index, text, method)]."""
    with fitz.open(path) as doc:
        pngs = [(i, doc[i].get_pixmap(dpi=OCR_DPI).tobytes("png")) for i in page_indices]
    with ThreadPoolExecutor(max_workers=max(1, VISION_PARALLEL)) as ex:
        results = list(ex.map(lambda item: (item[0], *ocr_png(item[1])), pngs))
    return results


def ocr_image_file(path: str) -> Tuple[str, str]:
    """JPG/PNG/TIFF/... -> (text, method). Images are normalised to PNG (size-capped) first."""
    with fitz.open(path) as doc:  # PyMuPDF opens common image formats as a 1-page document
        page = doc[0]
        zoom = min(1.0, 1600 / max(page.rect.width, page.rect.height, 1))
        png = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom)).tobytes("png")
    return ocr_png(png)
