"""Synthetic rubric calibration (PLAN_AI_DASHBOARD_TUTORIAL.md, Fase 0).

S1  analyse: per element, the rubric checklist of the latest AI note vs the evaluator's final score
S2  draft:   a new *inactive* rubric version where every AI CHECK carries a class [Wajib]/[Utama]/[Pendukung]
             and the score rules get a calibration rule based on those classes; ambiguous checks rephrased
S3  synthetic corrections from AI-vs-evaluator pairs (csms_ai_feedback.source = 'sintetis')

Usage (DB from server.config / ENV_FILE):
  python -m scripts.calibrate_rubric analyse  [--root <assessment folder id>] [--out report.md]
  python -m scripts.calibrate_rubric draft    [--label "v5 kalibrasi (draf)"]
  python -m scripts.calibrate_rubric feedback [--root <assessment folder id>]
The admin reviews the draft in ADMIN > AI CSMS and activates it; nothing here activates a version.
"""
import argparse
import asyncio
import re
from collections import defaultdict
from typing import Dict, List

from server import rubric
from server.db import get_pool

# Check classes decided from evaluator practice (Nov 2026). Unlisted checks are [Utama].
#  Wajib     : without it the element cannot score above 3 (core procedure/register/document)
#  Pendukung : only separates 6 from 10 (awards, extra programs, "khusus skor 10", exemptions)
CLASSES: Dict[str, Dict[str, List[str]]] = {
    "1":   {"W": ["02", "04"], "P": ["06", "08"]},
    "2":   {"W": ["01"], "P": ["07"]},
    "3.1": {"W": ["01", "02"], "P": ["07"]},
    "3.2": {"W": ["01"], "P": []},
    "3.3": {"W": ["01", "02"], "P": ["07"]},
    "3.4": {"W": ["01"], "P": ["06"]},
    "3.5": {"W": ["04"], "P": ["06"]},
    "3.6": {"W": ["01", "02"], "P": ["06"]},
    "4.1": {"W": ["01"], "P": ["08"]},
    "4.2": {"W": ["01", "03"], "P": ["08", "09"]},
    "4.3": {"W": ["01", "02"], "P": ["06"]},
    "4.4": {"W": ["01"], "P": ["06", "08"]},
    "4.5": {"W": ["01", "02"], "P": ["06", "07", "08", "09"]},
    "4.6": {"W": ["01", "02"], "P": ["09"]},
    "4.7": {"W": ["01", "02"], "P": ["07"]},
    "4.8": {"W": ["01", "07"], "P": ["06"]},
    "5.1": {"W": ["01", "04"], "P": ["07"]},
    "5.2": {"W": ["01", "02"], "P": ["06"]},
    "5.3": {"W": ["01", "02"], "P": ["08"]},
    "5.4": {"W": ["01", "02"], "P": ["10"]},
    "6.1": {"W": ["01", "02"], "P": ["07"]},
    "6.2": {"W": ["02", "03"], "P": ["06", "07"]},
    "6.3": {"W": ["01", "02"], "P": ["07"]},
    "6.4": {"W": ["01"], "P": ["06"]},
    "6.5": {"W": ["01", "03"], "P": ["05"]},
    "7.1": {"W": ["01", "03"], "P": ["06", "07", "08"]},
    "7.2": {"W": ["01", "02"], "P": ["06", "07"]},
    "8.1": {"W": ["01", "03"], "P": ["05"]},
    "8.2": {"W": ["01", "04"], "P": ["05"]},
}

# checks that were read the wrong way round (absence of a bad thing is the expected condition)
REPHRASE = {
    ("6.5", "Check_05_Regulatory_Non_Compliance"): (
        "Pastikan TIDAK terdapat dokumen sanksi, denda administratif, atau surat peringatan ketidakpatuhan regulasi K3LL "
        "dari instansi pemerintah/regulator (misal: Kementerian Lingkungan Hidup, Dinas Tenaga Kerja, Otoritas Pelabuhan). "
        "Nilai TERPENUHI bila tidak ditemukan dokumen sanksi; SEBAGIAN bila ada sanksi yang sudah ditindaklanjuti; "
        "TIDAK hanya bila ada sanksi yang belum ditindaklanjuti."
    ),
    ("4.7", "Check_06_Social_Incident_Log"): (
        "Pindai Log Kasus Keluhan Sosial. Nilai TERPENUHI bila log tersedia dan tidak ada kasus, atau semua kasus "
        "(sengketa, keluhan warga, demo) sudah berstatus selesai (\"Closed\") dengan bukti tindak lanjut; SEBAGIAN bila ada "
        "kasus yang masih terbuka dengan tindak lanjut berjalan; TIDAK bila log tidak tersedia atau kasus tidak ditindaklanjuti."
    ),
    ("7.1", "Check_08_Zero_Outstanding_NC"): (
        "Pindai NCR Log. Nilai TERPENUHI bila temuan Major = 0 dan semua temuan Minor/Observasi berstatus 'Closed' sebelum "
        "atau pada saat Penilaian Berjalan (PB) / Penilaian Akhir (PA); SEBAGIAN bila masih ada Minor terbuka dengan rencana "
        "tindak lanjut; TIDAK bila ada Major terbuka."
    ),
}

LABEL = {"W": "Wajib", "U": "Utama", "P": "Pendukung"}
CALIBRATION = {
    "score_10": "ATURAN KALIBRASI ({label}): Skor 10 bila SEMUA Check [Wajib] dan [Utama] TERPENUHI dan minimal separuh "
                "Check [Pendukung] TERPENUHI. Bila bertentangan dengan AI DECISION RULE di atas, aturan kalibrasi ini yang berlaku.",
    "score_6": "ATURAN KALIBRASI ({label}): Skor 6 bila tidak ada Check [Wajib] yang TIDAK (semuanya TERPENUHI atau SEBAGIAN) "
               "dan minimal 60% Check [Utama] TERPENUHI atau SEBAGIAN. Check [Pendukung] tidak dipersyaratkan untuk skor 6. Angka cakupan (%) pada aturan di atas "
               "menjadi acuan penilaian Check, bukan syarat mutlak. Status: ACCEPT.",
    "score_3": "ATURAN KALIBRASI ({label}): Skor 3 bila dokumen relevan ada tetapi ada Check [Wajib] yang TIDAK, "
               "atau kurang dari 60% Check [Utama] TERPENUHI/SEBAGIAN. Status: REVISION.",
}


def check_class(code: str, label: str) -> str:
    n = re.match(r"Check_(\d+)", label)
    c = CLASSES.get(code, {})
    if n and n.group(1) in c.get("W", []):
        return "W"
    if n and n.group(1) in c.get("P", []):
        return "P"
    return "U"


def calibrate_item(item: Dict[str, str], label: str) -> Dict[str, str]:
    out = dict(item)
    code = item["no"]
    text = item.get("evaluation_criteria") or ""
    for (c, chk), new in REPHRASE.items():
        if c == code:
            text = re.sub(r"(\[" + re.escape(chk) + r"\]:?)[^\[]*", lambda m: f"{m.group(1)} {new}\n", text)
    # [Check_xx_Name] -> [Check_xx_Name][Kelas]; existing class tags are replaced
    text = re.sub(r"\[(Check_[^\]]+)\](?:\[(?:Wajib|Utama|Pendukung)\])?",
                  lambda m: f"[{m.group(1)}][{LABEL[check_class(code, m.group(1))]}]", text)
    out["evaluation_criteria"] = text
    for field, rule in CALIBRATION.items():
        base = re.split(r"\n*ATURAN KALIBRASI", item.get(field) or "")[0].rstrip()
        out[field] = f"{base}\n\n{rule.format(label=label)}".strip()
    return out


def checklist_of(note: str) -> Dict[str, str]:
    """'Check_x: STATUS - ...' lines of the CHECKLIST RUBRIK section of an AI note."""
    return {m.group(1): m.group(2) for m in re.finditer(r"^\s*(Check_[^:\s]+):\s*(TERPENUHI|SEBAGIAN|TIDAK)", note or "", re.M)}


async def _pairs(conn, root: str = None):
    q = """SELECT f.id::text AS id, split_part(f.name, ' ', 1) AS code, f.score::float AS ev, f.ai_score::float AS ai,
                  f.status, f.ai_reasoning AS note
             FROM csms_contract_folder f
            WHERE f.file_type = 'folder' AND f.status <> 'pending' AND f.ai_reasoning LIKE 'HASIL PENILAIAN AI%'"""
    args = []
    if root:
        q += " AND f.path <@ (SELECT path FROM csms_contract_folder WHERE id = $1::uuid)"
        args.append(root)
    return [dict(r) for r in await conn.fetch(q, *args)]


async def analyse(root: str = None, out: str = None):
    pool = await get_pool()
    async with pool.acquire() as conn:
        pairs = await _pairs(conn, root)
    stats = defaultdict(lambda: {"high_tidak": 0, "n": 0})
    lines = ["| Elemen | Evaluator | AI | Check TIDAK/SEBAGIAN padahal evaluator ≥ 6 |", "|---|---|---|---|"]
    for p in sorted(pairs, key=lambda x: [int(v) for v in x["code"].split(".")]):
        cl = checklist_of(p["note"])
        miss = [k for k, v in cl.items() if v != "TERPENUHI"] if p["ev"] >= 6 else []
        for k in miss:
            stats[(p["code"], k)]["high_tidak"] += 1
        lines.append(f"| {p['code']} | {p['ev']:g} | {p['ai']:g} | " +
                     (", ".join(f"{k} [{LABEL[check_class(p['code'], k)]}]" for k in miss) or "-") + " |")
    text = "\n".join(lines)
    if out:
        with open(out, "w", encoding="utf-8") as f:
            f.write(text + "\n")
    print(text)
    print(f"\n{len(pairs)} pasangan AI vs evaluator")


async def draft(label: str):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await rubric.ensure_seeded(conn)
        items = await rubric.active_items(conn)
        items = [{c: (it.get(c) or "") for c in rubric.COLUMNS} for it in items]
        calibrated = [calibrate_item(it, label) for it in items]
        saved = await rubric.save_version(conn, calibrated, "marine", label, "kalibrasi sintetis", None, activate=False)
    print(f"draf rubrik versi {saved['version']} ({len(calibrated)} elemen), TIDAK aktif: {saved['id']}")


async def feedback(root: str = None):
    """One synthetic correction per element where AI and evaluator differ by >= 1 level."""
    levels = [0, 3, 6, 10]
    lvl = lambda s: min(range(4), key=lambda i: abs(levels[i] - s))
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("ALTER TABLE csms_ai_feedback ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'evaluator'")
        pairs = await _pairs(conn, root)
        n = 0
        for p in pairs:
            if p["ev"] < 0 or lvl(p["ev"]) == lvl(p["ai"]):
                continue
            cl = checklist_of(p["note"])
            sup = [k for k, v in cl.items() if v != "TERPENUHI" and check_class(p["code"], k) == "P"]
            core = [k for k, v in cl.items() if v != "TERPENUHI" and check_class(p["code"], k) != "P"]
            if p["ev"] > p["ai"]:
                reason = (f"Evaluator memberi {p['ev']:g} (AI {p['ai']:g}). "
                          + (f"Check pendukung ({', '.join(sup)}) tidak menjadi syarat skor 6. " if sup else "")
                          + (f"Kekurangan pada {', '.join(core)} dinilai evaluator belum menurunkan skor; nilai SEBAGIAN bila bukti inti ada."
                             if core else "Seluruh bukti inti sudah dinilai cukup oleh evaluator."))
            else:
                reason = (f"Evaluator memberi {p['ev']:g} (AI {p['ai']:g}). Bukti pada "
                          + (", ".join(core) or "Check inti") + " belum cukup untuk skor AI; periksa kelengkapan tanda tangan dan masa berlaku.")
            exists = await conn.fetchval(
                "SELECT 1 FROM csms_ai_feedback WHERE folder_id = $1::uuid AND source = 'sintetis'", p["id"])
            if exists:
                continue
            await conn.execute(
                """INSERT INTO csms_ai_feedback (folder_id, element_code, ai_score, evaluator_score, reason, source)
                   VALUES ($1::uuid, $2, $3, $4, $5, 'sintetis')""",
                p["id"], p["code"], p["ai"], p["ev"], reason)
            n += 1
    print(f"{n} koreksi sintetis ditambahkan")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["analyse", "draft", "feedback"])
    ap.add_argument("--root")
    ap.add_argument("--out")
    ap.add_argument("--label", default="v5 kalibrasi (draf)")
    a = ap.parse_args()
    if a.cmd == "analyse":
        asyncio.run(analyse(a.root, a.out))
    elif a.cmd == "draft":
        asyncio.run(draft(a.label))
    else:
        asyncio.run(feedback(a.root))


if __name__ == "__main__":
    main()
