import json
import os
from typing import List
from server.db import get_pool
from server.config import OPENAI_API_KEY, OLLAMA_BASE_URL, EMBEDDING_DIMENSIONS

# Ollama embedding model
OLLAMA_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "qllama/bge-large-en-v1.5:latest")

# Native dimensions per model
MODEL_DIMENSIONS = {
    "qllama/bge-large-en-v1.5:latest": 1024,
    "qllama/bge-small-en-v1.5:latest": 384,
    "snowflake-arctic-embed:latest": 1024,
    "mxbai-embed-large:latest": 1024,
    "nomic-embed-text:latest": 768,
    "text-embedding-3-small": 1536,
}

# Target dimensi dari schema DB (vector(1536))
TARGET_DIM = EMBEDDING_DIMENSIONS  # 1536


def _pad_to_target(vec: List[float]) -> List[float]:
    """Padding zero agar sesuai target dimensi DB (1536)."""
    if len(vec) < TARGET_DIM:
        return vec + [0.0] * (TARGET_DIM - len(vec))
    return vec[:TARGET_DIM]


def _get_model_dim(model: str) -> int:
    return MODEL_DIMENSIONS.get(model, 1536)


async def _embed_texts_ollama(texts: List[str]) -> List[List[float]]:
    """Ollama /api/embeddings — one text at a time."""
    import httpx
    base = OLLAMA_BASE_URL.replace("/api/chat", "").replace("/api", "")
    embeddings = []

    async with httpx.AsyncClient(timeout=120) as client:
        for text in texts:
            resp = await client.post(
                f"{base}/api/embeddings",
                json={"model": OLLAMA_EMBED_MODEL, "prompt": text},
            )
            resp.raise_for_status()
            raw = resp.json()["embedding"]
            embeddings.append(_pad_to_target(raw))

    return embeddings


async def _embed_texts_openai(texts: List[str]) -> List[List[float]]:
    """OpenAI text-embedding-3-small (native 1536 dim, no padding needed)."""
    import httpx
    import asyncio
    max_retries = 3
    async with httpx.AsyncClient(timeout=60) as client:
        for attempt in range(max_retries):
            try:
                resp = await client.post(
                    "https://api.openai.com/v1/embeddings",
                    headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
                    json={"model": "text-embedding-3-small", "input": texts, "dimensions": EMBEDDING_DIMENSIONS},
                )
                resp.raise_for_status()
                data = resp.json()["data"]
                return [item["embedding"] for item in data]
            except Exception as e:
                if attempt == max_retries - 1:
                    raise e
                print(f"[EMBED] OpenAI embedding failed (attempt {attempt+1}/{max_retries}): {e}. Retrying...")
                await asyncio.sleep(2 ** attempt)


async def _embed_texts(texts: List[str]) -> List[List[float]]:
    """
    Priority: OpenAI (bayar) → zero vector fallback.
    Semua output di-padding ke TARGET_DIM (1536) agar cocok dengan schema DB.
    """
    # Try OpenAI
    if OPENAI_API_KEY:
        try:
            return await _embed_texts_openai(texts)
        except Exception as e:
            print(f"[EMBED] OpenAI failed: {e}")

    # Last resort: zero vectors
    print(f"[EMBED] Using zero vector fallback (dim={TARGET_DIM})")
    return [[0.0] * TARGET_DIM for _ in texts]


async def generate_chunk_embeddings(contract_folder_id: str) -> int:
    """
    Read all chunks for this folder, batch-embed them, UPDATE embedding column.
    Returns number of chunks embedded.
    """
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, content FROM csms_evidence_chunk WHERE contract_folder_id = $1 AND embedding IS NULL ORDER BY chunk_index",
            contract_folder_id,
        )

    if not rows:
        return 0

    texts = [r["content"][:2000] for r in rows]
    ids = [r["id"] for r in rows]

    # Ollama: one at a time. OpenAI: can batch.
    # Keep batch_size=20 to avoid timeout on Ollama.
    batch_size = 20
    all_embeddings: List[List[float]] = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        embeddings = await _embed_texts(batch)
        all_embeddings.extend(embeddings)

    # UPDATE embeddings (all guaranteed to be 1536 dim now)
    async with pool.acquire() as conn:
        for chunk_id, emb in zip(ids, all_embeddings):
            emb_json = json.dumps(emb)
            await conn.execute(
                "UPDATE csms_evidence_chunk SET embedding = $1::vector WHERE id = $2",
                emb_json,
                chunk_id,
            )

    return len(all_embeddings)
