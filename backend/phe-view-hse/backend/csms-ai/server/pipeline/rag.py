import json
import re
from typing import Dict, Any, List, Optional
from server.db import get_pool
from server.pipeline.embedding import _embed_texts


_COLS = """id, category_id, title, description,
                          document_requirements, validation_rules, scoring_rules"""


async def retrieve_knowledge(category_id: str, query_text: str = "", rubric_version_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Rubric lookup for one CSMS element (folder name like '4.2 Bahaya ...').
    Deterministic first, vector search only as last resort:
      1. exact element code (e.g. '4.2')
      2. same major group (e.g. '4.%')
      3. pgvector similarity (skipped when the query embedding is a zero vector)
    """
    pool = await get_pool()
    m0 = re.match(r"^\s*(\d+(?:\.\d+)?)", category_id or "")
    if m0:
        try:
            from server import rubric
            async with pool.acquire() as conn:
                item = await rubric.get_item(conn, m0.group(1), version_id=rubric_version_id)
                try:
                    # real evaluator corrections first, synthetic ones (calibration drafts) only to fill up
                    corrections = await conn.fetch(
                        """SELECT ai_score::float AS ai, evaluator_score::float AS evaluator, reason
                             FROM csms_ai_feedback WHERE element_code = $1
                            ORDER BY (coalesce(source, 'evaluator') = 'evaluator') DESC, created_at DESC LIMIT 3""",
                        m0.group(1))
                except Exception:
                    corrections = []
            if item:
                view = rubric.juror_view(item)
                if corrections:
                    view["evaluator_corrections"] = [
                        f"AI memberi {c['ai']:g}, evaluator mengoreksi menjadi {c['evaluator']:g}: {c['reason']}" for c in corrections]
                return {"knowledge_base": [view], "rubric_version": item.get("version"), "rubric_item": item,
                        "query_used": query_text or category_id}
        except Exception as e:
            print(f"[RAG] rubric lookup failed, using csms_knowledge_base: {e}")
    m = re.match(r"^\s*(\d+(?:\.\d+)?)", category_id or "")
    code = m.group(1) if m else None
    rows = []

    async with pool.acquire() as conn:
        if code:
            rows = await conn.fetch(
                f"SELECT {_COLS}, 0.0 AS distance FROM csms_knowledge_base WHERE category_id = $1 LIMIT 5", code
            )
            if not rows:
                major = code.split(".")[0]
                rows = await conn.fetch(
                    f"SELECT {_COLS}, 0.0 AS distance FROM csms_knowledge_base "
                    "WHERE category_id = $1 OR category_id LIKE $2 ORDER BY category_id LIMIT 5",
                    major, major + ".%",
                )
        if not rows:
            query_vec = (await _embed_texts([query_text or category_id]))[0]
            if any(query_vec):
                try:
                    rows = await conn.fetch(
                        f"""SELECT {_COLS}, embedding <=> $1::vector AS distance
                           FROM csms_knowledge_base
                           ORDER BY embedding <=> $1::vector LIMIT 5""",
                        json.dumps(query_vec),
                    )
                except Exception:
                    rows = []
        if not rows:
            rows = await conn.fetch(
                f"SELECT {_COLS}, 0.0 AS distance FROM csms_knowledge_base ORDER BY category_id LIMIT 5"
            )

    results = []
    for r in rows:
        results.append({
            "category_id": r["category_id"],
            "title": r["title"],
            "description": r["description"],
            "document_requirements": json.loads(r["document_requirements"]) if r["document_requirements"] else [],
            "validation_rules": json.loads(r["validation_rules"]) if r["validation_rules"] else {},
            "scoring_rules": json.loads(r["scoring_rules"]) if r["scoring_rules"] else {},
            "distance": float(r["distance"]),
        })

    return {"knowledge_base": results, "query_used": query_text or category_id}


async def retrieve_evidence_chunks(contract_folder_id: str, limit: int = 20, file_paths: List[str] = None) -> List[Dict[str, Any]]:
    """Retrieve evidence chunks for a folder."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        if file_paths:
            rows = await conn.fetch(
                """SELECT id, file_path, chunk_index, content, metadata
                   FROM csms_evidence_chunk
                   WHERE contract_folder_id = $1 AND file_path = ANY($2)
                   ORDER BY file_path, chunk_index
                   LIMIT $3""",
                contract_folder_id,
                file_paths,
                limit,
            )
        else:
            rows = await conn.fetch(
                """SELECT id, file_path, chunk_index, content, metadata
                   FROM csms_evidence_chunk
                   WHERE contract_folder_id = $1
                   ORDER BY file_path, chunk_index
                   LIMIT $2""",
                contract_folder_id,
                limit,
            )
    return [
        {
            "id": str(r["id"]),
            "file_path": r["file_path"],
            "chunk_index": r["chunk_index"],
            "content": r["content"],
            "metadata": json.loads(r["metadata"]) if r["metadata"] else {},
        }
        for r in rows
    ]
