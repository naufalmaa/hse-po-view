"""Archives, type sniffing, OCR fallback and evidence budget. Run: python -m unittest discover -s tests"""
import io
import os
import shutil
import sys
import tempfile
import unittest
import zipfile
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import fitz  # PyMuPDF

from engine.extractors import page_ocr
from engine.extractors.router import ExtractorRouter


def make_pdf(path, text="Laporan Inspeksi K3LL bulan Juli 2026 oleh HSE Officer PT Contoh."):
    doc = fitz.open()
    doc.new_page().insert_text((72, 72), text)
    doc.save(path)


def make_scanned_pdf(path):
    """A page with an image only (no text layer)."""
    doc = fitz.open()
    page = doc.new_page()
    pix = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, 200, 100), 0)
    pix.clear_with(200)
    page.insert_image(fitz.Rect(72, 72, 272, 172), pixmap=pix)
    doc.save(path)


class ExtractionTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.router = ExtractorRouter()

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_zip_with_nested_folder_is_read(self):
        pdf = os.path.join(self.tmp, "a.pdf")
        make_pdf(pdf)
        z = os.path.join(self.tmp, "bukti.zip")
        with zipfile.ZipFile(z, "w") as f:
            f.write(pdf, "folder/a.pdf")
            f.writestr("__MACOSX/._a.pdf", b"junk")
        res = self.router.extract_document(z)
        text = " ".join(res["evidence"])
        self.assertIn("[folder/a.pdf]", text)
        self.assertIn("Inspeksi K3LL", text)
        self.assertNotIn("__MACOSX", text)

    def test_7z_is_read(self):
        import py7zr
        pdf = os.path.join(self.tmp, "b.pdf")
        make_pdf(pdf)
        s7 = os.path.join(self.tmp, "bukti.7z")
        with py7zr.SevenZipFile(s7, "w") as f:
            f.write(pdf, "b.pdf")
        self.assertIn("Inspeksi K3LL", " ".join(self.router.extract_document(s7)["evidence"]))

    def test_file_without_extension_is_sniffed(self):
        pdf = os.path.join(self.tmp, "noext")
        make_pdf(pdf)
        self.assertEqual(ExtractorRouter.sniff(pdf), "pdf")
        self.assertIn("Inspeksi K3LL", " ".join(self.router.extract_document(pdf)["evidence"]))

    def test_archive_limits_and_clear_error(self):
        z = os.path.join(self.tmp, "big.zip")
        with zipfile.ZipFile(z, "w") as f:
            for i in range(3):
                f.writestr(f"f{i}.txt", "x")
        with mock.patch("engine.extractors.archive_extractor.MAX_MEMBERS", 2):
            res = self.router.extract_document(z)
        self.assertEqual(res["evidence"], [])
        self.assertTrue(any("terlalu banyak" in e for e in res["errors"]))

    def test_scanned_page_uses_vision_then_paddle_fallback(self):
        pdf = os.path.join(self.tmp, "scan.pdf")
        make_scanned_pdf(pdf)
        with mock.patch.object(page_ocr, "_vision_text", side_effect=TimeoutError("vision down")), \
             mock.patch.object(page_ocr, "_paddle_text", return_value="SECURITY COMMITTEE MEETING notulen"):
            res = self.router.extract_document(pdf)
        self.assertTrue(res["ocr_used"])
        self.assertIn("SECURITY COMMITTEE MEETING", " ".join(res["evidence"]))
        self.assertEqual(res["metadata"].get("ocr_methods"), {"paddleocr": 1})

    def test_scanned_page_prefers_vision(self):
        pdf = os.path.join(self.tmp, "scan2.pdf")
        make_scanned_pdf(pdf)
        with mock.patch.object(page_ocr, "_vision_text", return_value="Teks dari qwen3-vl"), \
             mock.patch.object(page_ocr, "_paddle_text") as paddle:
            res = self.router.extract_document(pdf)
        paddle.assert_not_called()
        self.assertIn("Teks dari qwen3-vl", " ".join(res["evidence"]))

    def test_ocr_page_cap(self):
        with mock.patch.object(page_ocr, "OCR_FIRST_PAGES", 2), mock.patch.object(page_ocr, "OCR_LAST_PAGES", 1):
            self.assertEqual(page_ocr.pages_to_ocr(10), [0, 1, 9])
            self.assertEqual(page_ocr.pages_to_ocr(3), [0, 1, 2])


class EvidenceBudgetTests(unittest.TestCase):
    def test_every_file_gets_a_share_and_budget_is_respected(self):
        from server.main import _build_evidence
        chunks = [
            {"file_path": "id1/huge.pdf", "content": "A" * 50000, "metadata": {"extractor_used": "PDFExtractor"}},
            {"file_path": "id2/small.pdf", "content": "B" * 500, "metadata": {"extractor_used": "PDFExtractor"}},
            {"file_path": "id3/last.pdf", "content": "C" * 20000, "metadata": {"extractor_used": "PDFExtractor+OCR"}},
        ]
        files = [{"file_path": "huge.pdf"}, {"file_path": "small.pdf"}, {"file_path": "last.pdf"}, {"file_path": "unread.rar"}]
        ev = _build_evidence(chunks, files, 12000)
        docs = {d["filename"]: d["extracted_text_content"] for d in ev["EXTRACTED_DOCUMENT_TEXTS"]}
        self.assertEqual(set(docs), {"huge.pdf", "small.pdf", "last.pdf"})
        self.assertEqual(len(docs["small.pdf"]), 500)  # short file kept whole
        self.assertGreater(docs["last.pdf"].count("C"), 5000)  # not crowded out by the huge file
        self.assertLessEqual(sum(d.count("A") + d.count("B") + d.count("C") for d in docs.values()), 12000)
        self.assertIn("unread.rar", ev["SUBMITTED_FILES"])


if __name__ == "__main__":
    unittest.main()
