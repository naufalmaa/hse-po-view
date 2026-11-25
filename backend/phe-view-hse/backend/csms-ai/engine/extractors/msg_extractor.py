import os
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
            
            header_text = f"Subject: {subject}\nFrom: {sender}\nTo: {recipients}\n\nBody:\n{body}"
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
