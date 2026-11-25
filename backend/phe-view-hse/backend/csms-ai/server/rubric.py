"""CSMS AI rubric (kriteria penilaian) — the Excel "MARINE-kriteria_penilaian_CSMS_for_AI_rules" as data.

One version = one Excel sheet "csms" (29 elements, columns exactly as the Excel). Versions are kept;
exactly one active version per rubric type (marine, later project). The engine owns parsing/export so
there is a single implementation for seed, import and export.
"""
import io
import json
import os
import re
from typing import Any, Dict, List, Optional

import openpyxl

RUBRIC_DIR = os.path.join(os.path.dirname(__file__), "..", "knowledge_base", "marine", "source")
DEFAULT_RUBRIC_FILE = "MARINE-kriteria_penilaian_CSMS_for_AI_rules_v4_rev.xlsx"

# Excel columns of sheet "csms", in order (also the DB columns of csms_ai_rubric_item)
COLUMNS = [
    "no", "element_category", "element", "required_document", "document_format", "evaluation_criteria",
    "mandatory_fields", "score_0", "score_3", "score_6", "score_10", "status_accept", "status_reject",
    "status_revision", "validation_method", "ai_checkpoint_keywords", "document_expiry_check",
    "ai_confidence_threshold", "ai_reasoning_hint", "notes",
]
TEXT_COLUMNS = COLUMNS[1:]

DDL = """
CREATE TABLE IF NOT EXISTS csms_ai_rubric_version (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_type VARCHAR(20) NOT NULL DEFAULT 'marine',
  version INTEGER NOT NULL,
  label TEXT,
  source_filename TEXT,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (rubric_type, version)
);
CREATE TABLE IF NOT EXISTS csms_ai_rubric_item (
  version_id UUID NOT NULL REFERENCES csms_ai_rubric_version(id) ON DELETE CASCADE,
  no VARCHAR(10) NOT NULL,
  element_category TEXT, element TEXT, required_document TEXT, document_format TEXT, evaluation_criteria TEXT,
  mandatory_fields TEXT, score_0 TEXT, score_3 TEXT, score_6 TEXT, score_10 TEXT, status_accept TEXT,
  status_reject TEXT, status_revision TEXT, validation_method TEXT, ai_checkpoint_keywords TEXT,
  document_expiry_check TEXT, ai_confidence_threshold TEXT, ai_reasoning_hint TEXT, notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (version_id, no)
);
"""

EXPECTED_CODES = {"1", "2", "3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "4.1", "4.2", "4.3", "4.4", "4.5", "4.6",
                  "4.7", "4.8", "5.1", "5.2", "5.3", "5.4", "6.1", "6.2", "6.3", "6.4", "6.5", "7.1", "7.2",
                  "8.1", "8.2"}


def _clean(v: Any) -> str:
    if v is None:
        return ""
    s = str(v).replace("\r\n", "\n")
    return re.sub(r"<br\s*/?>", "\n", s).strip()


def parse_excel(data: bytes) -> List[Dict[str, str]]:
    """Excel bytes -> list of items. Raises ValueError with a readable message when the file is not valid."""
    wb = openpyxl.load_workbook(io.BytesIO(data), read_only=True, data_only=True)
    if "csms" not in wb.sheetnames:
        raise ValueError("Sheet 'csms' tidak ditemukan")
    rows = list(wb["csms"].iter_rows(values_only=True))
    if not rows:
        raise ValueError("Sheet 'csms' kosong")
    header = [str(h).strip() if h is not None else "" for h in rows[0]]
    missing = [c for c in COLUMNS if c not in header]
    if missing:
        raise ValueError(f"Kolom tidak ditemukan: {', '.join(missing)}")
    idx = {c: header.index(c) for c in COLUMNS}
    items = []
    for r in rows[1:]:
        code = _clean(r[idx["no"]]) if idx["no"] < len(r) else ""
        if not code:
            continue
        items.append({c: (code if c == "no" else _clean(r[idx[c]] if idx[c] < len(r) else "")) for c in COLUMNS})
    codes = {i["no"] for i in items}
    if len(codes) != len(items):
        raise ValueError("Kode elemen (kolom 'no') ada yang ganda")
    unknown = codes - EXPECTED_CODES
    if unknown:
        raise ValueError(f"Kode elemen tidak dikenal: {', '.join(sorted(unknown))}")
    return items


def export_excel(items: List[Dict[str, Any]]) -> bytes:
    """Items -> Excel with the same sheet/columns as the source file."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "csms"
    ws.append(COLUMNS)
    for it in items:
        ws.append([it.get(c) or "" for c in COLUMNS])
    for col, width in zip("ABCDEFGHIJKLMNOPQRST", [6, 28, 32] + [50] * 17):
        ws.column_dimensions[col].width = width
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


async def ensure_tables(conn) -> None:
    await conn.execute(DDL)


async def save_version(conn, items: List[Dict[str, str]], rubric_type: str = "marine", label: str = "",
                       source_filename: str = "", created_by: Optional[str] = None, activate: bool = True) -> Dict[str, Any]:
    async with conn.transaction():
        version = await conn.fetchval(
            "SELECT coalesce(max(version), 0) + 1 FROM csms_ai_rubric_version WHERE rubric_type = $1", rubric_type)
        vid = await conn.fetchval(
            """INSERT INTO csms_ai_rubric_version (rubric_type, version, label, source_filename, is_active, created_by)
               VALUES ($1, $2, $3, $4, FALSE, $5) RETURNING id""",
            rubric_type, version, label or f"v{version}", source_filename, created_by)
        await conn.executemany(
            f"INSERT INTO csms_ai_rubric_item (version_id, {', '.join(COLUMNS)}) "
            f"VALUES ($1, {', '.join(f'${i + 2}' for i in range(len(COLUMNS)))})",
            [(vid, *[it.get(c, "") for c in COLUMNS]) for it in items],
        )
        if activate:
            await conn.execute("UPDATE csms_ai_rubric_version SET is_active = (id = $1) WHERE rubric_type = $2", vid, rubric_type)
    return {"id": str(vid), "version": version}


async def ensure_seeded(conn) -> Optional[Dict[str, Any]]:
    """Create the tables and load the bundled Excel when no active version exists yet."""
    await ensure_tables(conn)
    active = await conn.fetchval("SELECT id FROM csms_ai_rubric_version WHERE rubric_type = 'marine' AND is_active")
    if active:
        return None
    with open(os.path.join(RUBRIC_DIR, DEFAULT_RUBRIC_FILE), "rb") as f:
        items = parse_excel(f.read())
    return await save_version(conn, items, "marine", "v4_rev (bawaan)", DEFAULT_RUBRIC_FILE)


async def active_items(conn, rubric_type: str = "marine") -> List[Dict[str, Any]]:
    rows = await conn.fetch(
        f"""SELECT i.{', i.'.join(COLUMNS)} FROM csms_ai_rubric_item i
            JOIN csms_ai_rubric_version v ON v.id = i.version_id
           WHERE v.rubric_type = $1 AND v.is_active""", rubric_type)
    return [dict(r) for r in rows]


async def get_item(conn, code: str, rubric_type: str = "marine", version_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Active version by default; a given version for a trial run (P4)."""
    if version_id:
        row = await conn.fetchrow(
            f"""SELECT v.version, i.{', i.'.join(COLUMNS)} FROM csms_ai_rubric_item i
                JOIN csms_ai_rubric_version v ON v.id = i.version_id
               WHERE v.id = $1::uuid AND i.no = $2""", version_id, code)
    else:
        row = await conn.fetchrow(
            f"""SELECT v.version, i.{', i.'.join(COLUMNS)} FROM csms_ai_rubric_item i
                JOIN csms_ai_rubric_version v ON v.id = i.version_id
               WHERE v.rubric_type = $1 AND v.is_active AND i.no = $2""", rubric_type, code)
    return dict(row) if row else None


def checks_of(item: Dict[str, Any]) -> List[str]:
    """AI CHECK labels, e.g. ['Check_01_Target_MWT', ...] from evaluation_criteria."""
    return list(dict.fromkeys(re.findall(r"\[(Check_[^\]]+)\]", item.get("evaluation_criteria") or "")))


def juror_view(item: Dict[str, Any]) -> Dict[str, Any]:
    """The part of the rubric the jurors need (the extraction schema in mandatory_fields is for summaries)."""
    return {
        "element": f"{item.get('no')} {item.get('element')}",
        "rubric_version": item.get("version"),
        "required_document": item.get("required_document"),
        "evaluation_criteria": item.get("evaluation_criteria"),
        "ai_checks": checks_of(item),
        "score_rules": {k: item.get(f"score_{k}") for k in ("0", "3", "6", "10")},
        "status_rules": {k: item.get(f"status_{k}") for k in ("accept", "reject", "revision")},
        "document_expiry_check": item.get("document_expiry_check"),
        "reasoning_hint": item.get("ai_reasoning_hint"),
        "notes": item.get("notes"),
    }
