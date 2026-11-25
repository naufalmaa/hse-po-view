"""Thorough mode: one summary per submitted file, written against the element's AI CHECKS (map step).

The jurors then judge the element from the summaries of *all* its files instead of raw text that would not
fit the model context (reduce step). Summaries are cached per (file, element, rubric version): a file never
changes (a re-upload gets a new id), so a re-run only summarises new files.
"""
import asyncio
import json
from typing import Any, Dict, List, Tuple

from server.db import get_pool

# characters of document text per summarisation call (model context ~40k characters incl. rubric)
PIECE_CHARS = 24000
PARALLEL = 2  # one vLLM server: a little concurrency, not more

SCHEMA = {
    "type": "object",
    "properties": {
        "document_type": {"type": "string"},
        "summary": {"type": "string"},
        "checks": {"type": "array", "items": {"type": "string"}},
        "key_facts": {"type": "array", "items": {"type": "string"}},
        "dates_and_validity": {"type": "array", "items": {"type": "string"}},
        "signatories": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["document_type", "summary", "checks", "key_facts"],
}


def _prompt(element: str, checks: List[str], criteria: str, required_doc: str, fname: str, text: str, part: str) -> str:
    return f"""You are reviewing ONE document submitted as evidence for CSMS element "{element}".
Extract only facts relevant to the AI CHECKS below. Do not score the element.

AI CHECKS: {", ".join(checks) or "-"}
EVALUATION CRITERIA (rubric):
{criteria[:6000]}
REQUIRED DOCUMENTS (rubric):
{required_doc[:2500]}

DOCUMENT: {fname}{part}
{text}

Return JSON with:
- document_type: what this document is (e.g. "Laporan MWT", "Sertifikat ISO 45001")
- summary: 2-4 sentences on what the document proves
- checks: for each AI CHECK this document is relevant to: "<label>: TERPENUHI|SEBAGIAN|TIDAK - <fact + short exact quote, page if known>"
- key_facts: numbers, names, vessel/asset, form numbers, counts relevant to the checks
- dates_and_validity: issue/validity/expiry dates found
- signatories: who signed/approved (name, position)
Formal Bahasa Indonesia (English terms allowed), no emoji, no markdown."""


def _summarise_sync(provider, element, checks, criteria, required_doc, fname, text) -> Dict[str, Any]:
    pieces = [text[i:i + PIECE_CHARS] for i in range(0, max(len(text), 1), PIECE_CHARS)] or [""]
    parts = []
    for n, piece in enumerate(pieces, 1):
        label = f" (bagian {n}/{len(pieces)})" if len(pieces) > 1 else ""
        parts.append(provider.generate_structured_response(
            _prompt(element, checks, criteria, required_doc, fname, piece, label), SCHEMA,
            "You extract audit evidence from documents objectively. Never invent facts that are not in the text."))
    if len(parts) == 1:
        return parts[0]
    merged = {"document_type": parts[0].get("document_type", ""), "summary": " ".join(p.get("summary", "") for p in parts)}
    for k in ("checks", "key_facts", "dates_and_validity", "signatories"):
        merged[k] = [x for p in parts for x in (p.get(k) or [])]
    return merged


def summary_text(s: Dict[str, Any]) -> str:
    lines = [f"Jenis dokumen: {s.get('document_type', '-')}", f"Ringkasan: {s.get('summary', '-')}"]
    for title, key in (("Pemeriksaan", "checks"), ("Fakta kunci", "key_facts"), ("Tanggal/masa berlaku", "dates_and_validity"),
                       ("Penandatangan", "signatories")):
        vals = [str(v) for v in (s.get(key) or []) if str(v).strip()]
        if vals:
            lines.append(f"{title}: " + " | ".join(vals))
    return "\n".join(lines)


async def summarise_element_files(element_code: str, rubric_item: Dict[str, Any], files: List[Tuple[str, str, str]],
                                  on_progress=None) -> List[Dict[str, str]]:
    """files: [(file_id, filename, text)] -> [{"filename", "extracted_text_content"}] using cached summaries."""
    from engine.providers.provider_factory import get_provider
    from server.rubric import checks_of

    version = int(rubric_item.get("version") or 0)
    element = f"{rubric_item.get('no', element_code)} {rubric_item.get('element', '')}".strip()
    checks = checks_of(rubric_item)
    criteria = rubric_item.get("evaluation_criteria") or ""
    required_doc = rubric_item.get("required_document") or ""

    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT file_id::text AS fid, summary FROM csms_ai_file_summary WHERE element_code = $1 AND rubric_version = $2 AND file_id = ANY($3::uuid[])",
            element_code, version, [f[0] for f in files])
    cached = {r["fid"]: (json.loads(r["summary"]) if isinstance(r["summary"], str) else r["summary"]) for r in rows}

    todo = [f for f in files if f[0] not in cached and f[2].strip()]
    sem = asyncio.Semaphore(PARALLEL)
    done = 0

    async def run(fid, fname, text):
        nonlocal done
        async with sem:
            provider = get_provider(role="reasoning_model")
            s = await asyncio.to_thread(_summarise_sync, provider, element, checks, criteria, required_doc, fname, text)
        async with pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO csms_ai_file_summary (file_id, element_code, rubric_version, summary)
                   VALUES ($1::uuid, $2, $3, $4::jsonb) ON CONFLICT (file_id, element_code, rubric_version) DO UPDATE SET summary = EXCLUDED.summary""",
                fid, element_code, version, json.dumps(s, ensure_ascii=False))
        cached[fid] = s
        done += 1
        if on_progress:
            await on_progress(done, len(todo), fname)

    if todo:
        results = await asyncio.gather(*(run(*f) for f in todo), return_exceptions=True)
        for f, r in zip(todo, results):
            if isinstance(r, Exception):
                print(f"[SUMMARY] {f[1]}: {type(r).__name__}: {str(r)[:160]}")

    out = []
    for fid, fname, text in files:
        if fid in cached:
            out.append({"filename": fname, "extracted_text_content": summary_text(cached[fid])})
        elif text.strip():  # summary failed: fall back to the raw text (fair budget applies later)
            out.append({"filename": fname, "extracted_text_content": text})
    return out
