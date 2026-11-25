import json
import time
import os
from typing import Dict, Any, Optional, List
from engine.providers.provider_factory import get_provider
from engine.extractors.pdf_extractor import PDFExtractor

class VisionExtractor:
    """
    Vision Extractor using dedicated vision model (Qwen/Qwen3-VL-8B-Instruct via role='vision_model').
    Extracts structured evidence, tables, forms, and document summaries without scoring.
    """
    def __init__(self, role: str = "vision_model"):
        self.provider = get_provider(role=role)
        self.pdf_fallback = PDFExtractor()
        self.last_latency = 0.0
        self.last_confidence = 0.0

    def extract(self, file_path: str, ocr_output: Optional[Any] = None, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        start_time = time.time()
        filename = os.path.basename(file_path)
        meta_str = json.dumps(metadata or {}, indent=2)

        # Ensure we have text content even if ocr_output was empty or omitted
        evidence_list: List[str] = []
        if isinstance(ocr_output, list):
            evidence_list = [str(x) for x in ocr_output if str(x).strip()]
        elif isinstance(ocr_output, dict):
            evidence_list = [str(x) for x in ocr_output.get("evidence", []) if str(x).strip()]
        elif isinstance(ocr_output, str) and ocr_output.strip():
            evidence_list = [ocr_output.strip()]

        # If empty and file is PDF, extract text directly
        if not evidence_list and file_path.lower().endswith(".pdf"):
            try:
                pdf_res = self.pdf_fallback.extract(file_path)
                evidence_list = pdf_res.get("evidence", [])
            except Exception:
                pass

        content_preview = "\n\n".join(evidence_list)[:4500] if evidence_list else "Scanned document (no raw OCR text layer available)."

        system_prompt = (
            "You are a specialized Document Vision & Evidence Extraction Assistant. "
            "Understand the document layout, policies, tables, and text, and extract factual evidence into structured JSON. "
            "NEVER score compliance. ONLY extract facts and evidence."
        )

        prompt = f"""Extract structured information from the following document:
        File Name: {filename}
        Metadata: {meta_str}

        Document Content / OCR Preview:
        {content_preview}

        Extract the document type, concise summary, key entities, tables, verbatim evidence snippets, and your confidence score (0.0 - 1.0).
        Return ONLY JSON adhering to the required schema."""

        schema = {
            "type": "object",
            "properties": {
                "document_type": {"type": "string"},
                "summary": {"type": "string"},
                "entities": {"type": "array", "items": {"type": "string"}},
                "tables": {"type": "array", "items": {"type": "object"}},
                "evidence": {"type": "array", "items": {"type": "string"}},
                "confidence": {"type": "number"}
            },
            "required": ["document_type", "summary", "entities", "tables", "evidence", "confidence"]
        }

        try:
            result = self.provider.generate_structured_response(prompt, schema, system_prompt)
            self.last_latency = round(time.time() - start_time, 3)
            self.last_confidence = float(result.get("confidence", 0.93) or 0.93)
            
            # Ensure non-empty evidence if VLLM didn't return list
            extracted_ev = result.get("evidence", [])
            if not extracted_ev and evidence_list:
                extracted_ev = evidence_list[:10]

            return {
                "document_type": result.get("document_type", "Document") or "HSE Document",
                "summary": result.get("summary", "") or f"Extracted document content from {filename}",
                "entities": result.get("entities", []),
                "tables": result.get("tables", []),
                "evidence": extracted_ev,
                "confidence": self.last_confidence,
                "latency": self.last_latency
            }
        except Exception as e:
            self.last_latency = round(time.time() - start_time, 3)
            self.last_confidence = 0.88 if evidence_list else 0.50
            return {
                "document_type": "PDF/Document",
                "summary": f"Extracted document from {filename}",
                "entities": [],
                "tables": [],
                "evidence": evidence_list[:15],
                "confidence": self.last_confidence,
                "latency": self.last_latency,
                "warning": str(e)
            }
