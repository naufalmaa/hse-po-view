"""Deterministic scoring and confidence on top of the LLM panel (PLAN_AI_DASHBOARD_TUTORIAL.md, P1-P3).

P1  score from the rubric checklist: every AI CHECK in the rubric carries a class [Wajib]/[Utama]/[Pendukung];
    the jurors judge each check, the score follows from the classes. The LLM's own score is only a cross-check.
P2  confidence = LLM confidence x juror agreement x verified quotes x check coverage x (LLM vs checklist agreement).
    Below 0.85 the element is shown as "perlu tinjauan" and is not applied by default.
P3  quotes: every "file: quote" evidence item must be found in the extracted document text; others are dropped.
A rubric without classes (not calibrated) keeps the LLM score, so nothing changes until the rubric is calibrated.
"""
import re
from typing import Any, Dict, Iterable, List, Optional, Tuple

LEVELS = [0.0, 3.0, 6.0, 10.0]
CLASS_OF = {"wajib": "W", "utama": "U", "pendukung": "P"}
MIN_CONFIDENCE = 0.85


def level(score: float) -> int:
    return min(range(len(LEVELS)), key=lambda i: abs(LEVELS[i] - float(score)))


def classes_from_criteria(criteria: str) -> Dict[str, str]:
    """'[Check_01_X][Wajib]: ...' -> {'Check_01_X': 'W'}; empty when the rubric has no classes."""
    return {m.group(1): CLASS_OF[m.group(2).lower()]
            for m in re.finditer(r"\[(Check_[^\]]+)\]\[(Wajib|Utama|Pendukung)\]", criteria or "", re.I)}


def checklist_score(checks: List[Dict[str, str]], classes: Dict[str, str]) -> Tuple[Optional[float], str, float]:
    """(score or None, explanation, coverage). None when the rubric is not calibrated or nothing was judged."""
    if not classes or not checks:
        return None, "", 0.0
    norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())
    by_norm = {norm(k): v for k, v in classes.items()}
    status = {}
    for c in checks:
        cls = classes.get(c["label"]) or by_norm.get(norm(c["label"]))
        if cls:
            status[c["label"]] = (cls, c["status"])
    coverage = len(status) / len(classes)
    if not status:
        return None, "", 0.0
    group = lambda k: [st for cls, st in status.values() if cls == k]
    W, U, P = group("W"), group("U"), group("P")
    ok = lambda st: st == "TERPENUHI"
    part = lambda st: st in ("TERPENUHI", "SEBAGIAN")
    if all(ok(s) for s in W + U) and (not P or sum(map(ok, P)) >= len(P) / 2):
        score = 10.0
    elif all(part(s) for s in W) and (not U or sum(map(part, U)) / len(U) >= 0.6):
        score = 6.0
    else:
        score = 3.0
    count = lambda xs, f: f"{sum(map(f, xs))}/{len(xs)}"
    why = (f"Skor dihitung dari checklist rubrik: Wajib {count(W, ok)} terpenuhi, Utama {count(U, part)} terpenuhi/sebagian, "
           f"Pendukung {count(P, ok)} terpenuhi.")
    return score, why, coverage


def _norm_text(s: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s]", " ", (s or "").lower())).strip()


def verify_quotes(items: Optional[Iterable[Any]], corpus: str) -> Tuple[List[str], int, int]:
    """Keeps evidence items whose quote is found in the document text (exact, or 5 consecutive words).
    Items without a quote (plain statements) are kept and not counted."""
    kept, checked, verified = [], 0, 0
    for raw in items or []:
        text = str(raw)
        quote = text.split(":", 1)[1] if ":" in text else text
        q = _norm_text(quote.strip().strip('"').strip("'"))
        words = q.split()
        if len(words) < 3:
            kept.append(text)
            continue
        checked += 1
        found = q in corpus or any(" ".join(words[i:i + 5]) in corpus for i in range(0, max(1, len(words) - 4)))
        if found:
            verified += 1
            kept.append(text)
    return kept, checked, verified


def apply_rules(rubric_item: Optional[Dict[str, Any]], jurors: Dict[str, Dict[str, Any]], llm_score: float,
                llm_confidence: float, corpus_text: str, merge_checks) -> Dict[str, Any]:
    """Final score, confidence and notes for one element. `jurors` evidence lists are filtered in place (P3)."""
    corpus = _norm_text(corpus_text)
    checked = verified = 0
    if corpus:
        for j in jurors.values():
            if j and j.get("evidence"):
                j["evidence"], c, v = verify_quotes(j.get("evidence"), corpus)
                checked += c
                verified += v
    quote_factor = 1.0 if not checked else 0.85 + 0.15 * (verified / checked)

    juror_scores = [float(j["score"]) for j in jurors.values() if j and j.get("score") is not None]
    spread = (max(map(level, juror_scores)) - min(map(level, juror_scores))) if len(juror_scores) > 1 else 0
    agreement = {0: 1.0, 1: 0.92}.get(spread, 0.78)

    classes = classes_from_criteria((rubric_item or {}).get("evaluation_criteria") or "")
    rule_score, why, coverage = checklist_score(merge_checks(jurors), classes)
    notes = []
    final = llm_score
    cross = 1.0
    if rule_score is not None:
        final = rule_score
        notes.append(why)
        if abs(level(rule_score) - level(llm_score)) >= 2:
            cross = 0.85
            notes.append(f"Skor juri ({llm_score:g}) berbeda jauh dari checklist; perlu tinjauan evaluator.")
    cov_factor = 1.0 if rule_score is None else 0.8 + 0.2 * coverage
    if checked and verified < checked:
        notes.append(f"{checked - verified} dari {checked} kutipan bukti tidak ditemukan di dokumen dan diabaikan.")

    confidence = max(0.0, min(1.0, float(llm_confidence or 0) * agreement * quote_factor * cov_factor * cross))
    if confidence < MIN_CONFIDENCE:
        why_low = [txt for ok, txt in (
            (float(llm_confidence or 0) >= 0.85, "keyakinan juri rendah"),
            (agreement >= 1.0, "skor antarjuri berbeda"),
            (quote_factor >= 0.95, "sebagian kutipan tidak ditemukan"),
            (cov_factor >= 0.95, "tidak semua AI CHECK dinilai"),
            (cross >= 1.0, "skor juri berbeda dari checklist"),
        ) if not ok]
        notes.append("Perlu tinjauan evaluator: " + (", ".join(why_low) or "keyakinan di bawah 0,85") + ".")
    return {
        "score": final,
        "status": "accept" if final >= 6 else "revision" if final >= 3 else "reject",
        "confidence": round(confidence, 2),
        "notes": notes,
        "needs_review": confidence < MIN_CONFIDENCE,
        "rule_score": rule_score,
    }
