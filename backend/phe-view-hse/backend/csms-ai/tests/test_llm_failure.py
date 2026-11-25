"""LLM failure must never turn into a fabricated score. Run: python -m unittest discover -s tests"""
import os, sys, unittest
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from engine.providers.base_provider import LLMError
from engine.providers.vllm_provider import VLLMProvider
from engine.jurors.compliance_juror import ComplianceJuror
from engine.consensus.consensus_agent import ConsensusAgent

SCHEMA = {"type": "object", "properties": {"score": {"type": "number"}}}


def _provider():
    return VLLMProvider({"endpoint": "http://127.0.0.1:9/v1", "model": "m", "timeout": 1})


class LLMFailureTests(unittest.TestCase):
    def test_payload_has_toplevel_chat_template_kwargs(self):
        sent = {}

        class R:
            status_code = 200
            def raise_for_status(self): pass
            def json(self): return {"choices": [{"message": {"content": '{"score": 6}'}}], "usage": {}}

        def fake_post(url, headers=None, json=None, timeout=None):
            sent.update(json); return R()

        with mock.patch("requests.post", fake_post):
            out = _provider().generate_structured_response("p", SCHEMA)
        self.assertEqual(out["score"], 6)
        self.assertEqual(sent["chat_template_kwargs"], {"enable_thinking": False})
        self.assertNotIn("extra_body", sent)

    def test_vllm_and_fallback_down_raises(self):
        p = _provider()
        with mock.patch("requests.post", side_effect=TimeoutError("boom")), \
             mock.patch.object(VLLMProvider, "_openai_fallback", side_effect=RuntimeError("no key")), \
             mock.patch("time.sleep"):
            with self.assertRaises(LLMError):
                p.generate_structured_response("p", SCHEMA)

    def test_juror_without_score_raises(self):
        j = ComplianceJuror.__new__(ComplianceJuror)
        j.role = "reasoning_model"
        j.provider = mock.Mock(generate_structured_response=mock.Mock(return_value={"reasoning": []}))
        with self.assertRaises(LLMError):
            j.evaluate({}, {}, {})

    def test_consensus_falls_back_to_average_and_flags_review(self):
        c = ConsensusAgent.__new__(ConsensusAgent)
        c.provider = mock.Mock(generate_structured_response=mock.Mock(side_effect=LLMError("down")))
        r = c.resolve({"score": 6, "confidence": .8}, {"score": 6, "confidence": .8}, {"score": 3, "confidence": .8})
        self.assertEqual(r["recommended_score"], 6)
        self.assertTrue(r["requires_review"])


if __name__ == "__main__":
    unittest.main()


class NotifyPayloadTests(unittest.TestCase):
    """Regression for 'payload string too long' (Postgres NOTIFY limit 8000 bytes)."""

    def test_large_payload_is_trimmed_below_limit(self):
        from server.notify import build_payload, MAX_PAYLOAD_BYTES
        import json
        big = {"folderId": "f", "jobId": "j", "status": "subfolder_completed", "aiScore": 6,
               "aiReasoning": "x" * 20000, "progressMessage": "y" * 20000}
        out = build_payload(big)
        self.assertLessEqual(len(out.encode("utf-8")), MAX_PAYLOAD_BYTES)
        d = json.loads(out)
        self.assertEqual((d["jobId"], d["status"], d["aiScore"]), ("j", "subfolder_completed", 6))
        self.assertNotIn("aiReasoning", d)

    def test_notify_never_raises(self):
        import asyncio
        from server.notify import notify

        class Conn:
            async def execute(self, *a):
                raise RuntimeError("payload string too long")

        asyncio.run(notify(Conn(), {"jobId": "j", "status": "processing"}))  # must not raise
