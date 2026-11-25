"""
One-time script to seed csms_knowledge_base from knowledge_base/marine/ JSON files.

Usage:
    cd backend/csms-ai
    venv\Scripts\activate
    python -m server.scripts.seed_knowledge_base

Requires:
    pip install asyncpg httpx
    DATABASE_URL + OLLAMA_BASE_URL in .env
"""
import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from server.config import DATABASE_URL, OLLAMA_BASE_URL, OPENAI_API_KEY, EMBEDDING_DIMENSIONS
from server.db import get_pool
from server.pipeline.embedding import _embed_texts, _get_model_dim, OLLAMA_EMBED_MODEL


KB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "knowledge_base", "marine")


async def seed():
    pool = await get_pool()

    categories_dir = os.path.join(KB_PATH, "categories")
    scoring_dir = os.path.join(KB_PATH, "scoring_rules")
    validation_dir = os.path.join(KB_PATH, "validation_rules")
    doc_req_dir = os.path.join(KB_PATH, "document_requirements")

    if not os.path.exists(categories_dir):
        print(f"[ERROR] Categories dir not found: {categories_dir}")
        return

    entries = []
    for fname in sorted(os.listdir(categories_dir)):
        if not fname.endswith(".json"):
            continue
        cat_id = fname.replace(".json", "")
        cat_file = os.path.join(categories_dir, fname)
        with open(cat_file, "r", encoding="utf-8") as f:
            cat_data = json.load(f)

        sr_file = os.path.join(scoring_dir, f"SR-{cat_id}.json")
        scoring_rules = {}
        if os.path.exists(sr_file):
            with open(sr_file, "r", encoding="utf-8") as f:
                scoring_rules = json.load(f)

        vr_file = os.path.join(validation_dir, f"VR-{cat_id}.json")
        validation_rules = {}
        if os.path.exists(vr_file):
            with open(vr_file, "r", encoding="utf-8") as f:
                validation_rules = json.load(f)

        dr_file = os.path.join(doc_req_dir, f"DR-{cat_id}.json")
        doc_requirements = []
        if os.path.exists(dr_file):
            with open(dr_file, "r", encoding="utf-8") as f:
                doc_requirements = json.load(f)

        title = cat_data.get("title", cat_data.get("name", cat_id))
        description = cat_data.get("description", "")
        embedding_text = f"{title}. {description}"

        entries.append({
            "category_id": cat_id,
            "title": title,
            "description": description,
            "document_requirements": doc_requirements,
            "validation_rules": validation_rules,
            "scoring_rules": scoring_rules,
            "embedding_text": embedding_text,
        })

    if not entries:
        print("[WARN] No entries found")
        return

    dims = _get_model_dim(OLLAMA_EMBED_MODEL)
    print(f"[INFO] Seeding {len(entries)} entries (model: {OLLAMA_EMBED_MODEL}, dim: {dims})...")

    # Generate embeddings
    for i, entry in enumerate(entries):
        emb = await _embed_texts([entry["embedding_text"]])
        entry["embedding"] = emb[0]
        if (i + 1) % 5 == 0:
            print(f"  Embedded {i + 1}/{len(entries)}")

    # Upsert into database
    async with pool.acquire() as conn:
        for entry in entries:
            emb_json = json.dumps(entry["embedding"]) if "embedding" in entry else None
            await conn.execute(
                """INSERT INTO csms_knowledge_base
                   (category_id, title, description, document_requirements,
                    validation_rules, scoring_rules, embedding)
                   VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::vector)
                   ON CONFLICT (category_id) DO UPDATE SET
                     title = EXCLUDED.title,
                     description = EXCLUDED.description,
                     document_requirements = EXCLUDED.document_requirements,
                     validation_rules = EXCLUDED.validation_rules,
                     scoring_rules = EXCLUDED.scoring_rules,
                     embedding = EXCLUDED.embedding,
                     updated_at = NOW()""",
                entry["category_id"],
                entry["title"],
                entry["description"],
                json.dumps(entry["document_requirements"]),
                json.dumps(entry["validation_rules"]),
                json.dumps(entry["scoring_rules"]),
                emb_json,
            )

    print(f"[OK] Seeded {len(entries)} entries into csms_knowledge_base")


if __name__ == "__main__":
    asyncio.run(seed())
