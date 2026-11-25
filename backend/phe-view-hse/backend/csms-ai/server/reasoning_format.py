"""Formal, plain-text AI assessment note for one CSMS element.

The text is stored in csms_contract_folder.ai_reasoning and copied into the evaluator's "Catatan"
field, so it uses numbered sections and no markdown/emoji. The UI parses the section headings
(see ChangeRatingForm.tsx) and falls back to raw text for notes written in the old format.
"""
import re
from typing import Any, Dict, Iterable, List, Optional

JUROR_TITLES = [
    ("compliance", "Juri Kepatuhan (Compliance)"),
    ("evidence", "Juri Bukti (Evidence)"),
    ("hse", "Juri HSE"),
]


def _status_label(status: str) -> str:
    return {"accept": "Diterima", "revision": "Revisi"}.get(status, "Ditolak")


def _num(x: Any) -> str:
    try:
        return f"{float(x):.2f}".replace(".", ",")
    except (TypeError, ValueError):
        return "-"


def _clean(text: Any) -> str:
    """One line of plain text: no markdown markers or emoji the model may still emit."""
    t = re.sub(r"[*#`]{1,3}", "", str(text))  # keep "_" : it appears in file names
    t = re.sub("[\U0001F300-\U0001FAFF☀-➿]", "", t)
    return " ".join(t.split()).strip(" -•")


def _items(values: Optional[Iterable[Any]]) -> List[str]:
    if not values:
        return []
    if isinstance(values, str):
        values = [values]
    out = []
    for v in values:
        t = _clean(v)
        if t:
            out.append(t)
    return out


def _lettered(lines: List[str], indent: str) -> List[str]:
    return [f"{indent}{chr(97 + i)}. {t}" for i, t in enumerate(lines[:26])]


CHECK_ORDER = {"TIDAK": 0, "SEBAGIAN": 1, "TERPENUHI": 2}


def merge_checks(jurors: Optional[Dict[str, Dict[str, Any]]]) -> List[Dict[str, str]]:
    """One status per AI CHECK across the three jurors: majority, ties go to the more conservative status."""
    merged: Dict[str, List[tuple]] = {}
    for key, _ in JUROR_TITLES:
        for raw in (jurors or {}).get(key, {}).get("checks") or []:
            m = re.match(r"\s*(Check_[^:]+):\s*(TERPENUHI|SEBAGIAN|TIDAK)\b\s*-?\s*(.*)", str(raw), re.I)
            if m:
                merged.setdefault(m.group(1).strip(), []).append((m.group(2).upper(), _clean(m.group(3))))
    out = []
    for label, votes in merged.items():
        counts: Dict[str, int] = {}
        for st, _ in votes:
            counts[st] = counts.get(st, 0) + 1
        status = sorted(counts, key=lambda st: (-counts[st], CHECK_ORDER[st]))[0]
        note = next((t for st, t in votes if st == status and t), "")
        out.append({"label": label, "status": status, "note": note})
    return out


def format_reasoning(
    element: str,
    final_score: Any,
    status: str,
    confidence: Any,
    conclusion: str,
    jurors: Optional[Dict[str, Dict[str, Any]]] = None,
    recommendations: Optional[Iterable[Any]] = None,
    required_documents: Optional[Iterable[Any]] = None,
    gaps: Optional[Iterable[Any]] = None,
    mode: Optional[str] = None,
) -> str:
    score_txt = int(final_score) if float(final_score).is_integer() else final_score
    mode_txt = {"fast": " | Mode: Cepat", "thorough": " | Mode: Menyeluruh"}.get(mode or "", "")
    lines = [
        f"HASIL PENILAIAN AI - {element}",
        f"Skor akhir: {score_txt} ({_status_label(status)}) | Tingkat keyakinan: {_num(confidence)}{mode_txt}",
        "",
        "1. KESIMPULAN",
        f"   {_clean(conclusion or '-')}",
    ]
    n = 1
    checks = merge_checks(jurors)
    if checks:
        n += 1
        lines += ["", f"{n}. CHECKLIST RUBRIK"]
        lines += [f"   {c['label']}: {c['status']}" + (f" - {c['note']}" if c["note"] else "") for c in checks]

    n += 1
    lines += ["", f"{n}. PENILAIAN JURI"]
    if jurors:
        present = [(k, t) for k, t in JUROR_TITLES if jurors.get(k)]
        for i, (key, title) in enumerate(present, 1):
            j = jurors.get(key) or {}
            if mode == "fast" and len(present) == 1:
                title = "Panel Juri (mode cepat)"
            lines.append(f"   {n}.{i} {title} - skor {j.get('score', '-')} (keyakinan {_num(j.get('confidence'))})")
            for label, field in (("Temuan", "reasoning"), ("Bukti", "evidence"), ("Kekurangan", "gaps")):
                vals = _items(j.get(field))
                if vals:
                    lines.append(f"       {label}:")
                    lines.extend(_lettered(vals, "         "))
    else:
        lines.append("   Tidak ada penilaian juri (lihat kesimpulan).")
        g = _items(gaps)
        if g:
            lines.append("       Kekurangan:")
            lines.extend(_lettered(g, "         "))

    recs = _items(recommendations)
    docs = _items(required_documents)
    n += 1
    lines += ["", f"{n}. REKOMENDASI UNTUK MENCAPAI SKOR 10"]
    lines += _lettered(recs, "   ") if recs else ["   Tidak ada rekomendasi tambahan."]
    if docs:
        n += 1
        lines += ["", f"{n}. DOKUMEN YANG PERLU DILENGKAPI"]
        lines += _lettered(docs, "   ")
    return "\n".join(lines)
