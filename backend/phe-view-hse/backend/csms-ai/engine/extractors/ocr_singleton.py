try:
    from paddleocr import PaddleOCR
except ImportError:
    PaddleOCR = None

_shared_ocr_instance = None

def get_shared_ocr():
    global _shared_ocr_instance
    if _shared_ocr_instance is None and PaddleOCR is not None:
        _shared_ocr_instance = PaddleOCR(use_angle_cls=True, lang='en')
    return _shared_ocr_instance
