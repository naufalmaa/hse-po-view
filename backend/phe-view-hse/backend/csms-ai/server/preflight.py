"""Pemeriksaan csms-ai sebelum dijalankan (runbook deploy, sebelum pm2/docker start).
    python -m server.preflight        -> keluar 0 bila siap, 1 bila ada pemeriksaan wajib gagal
Tidak pernah mencetak password."""
import asyncio
import os
import shutil
import sys
import time
from urllib.parse import urlparse

import asyncpg
import requests

from server.config import BASE_DIR, DATABASE_URL, UPLOADS_DIR

results = []


def add(name, level, ok, msg, t0):
    results.append((name, level, ok, msg, int((time.time() - t0) * 1000)))


async def check_db():
    t0 = time.time()
    u = urlparse(DATABASE_URL)
    target = f"{u.hostname}:{u.port or 5432}{u.path}"
    try:
        conn = await asyncio.wait_for(asyncpg.connect(DATABASE_URL), timeout=5)
        try:
            exts = {r["extname"] for r in await conn.fetch("SELECT extname FROM pg_extension")}
            jobs = await conn.fetchval("SELECT to_regclass('public.csms_ai_evaluation_job') IS NOT NULL")
        finally:
            await conn.close()
        add("Database", "fatal", True, target, t0)
        missing = [e for e in ("ltree", "uuid-ossp") if e not in exts]
        add("Ekstensi", "fatal", not missing, "ltree, uuid-ossp" if not missing else "belum terpasang: " + ", ".join(missing), t0)
        add("Skema", "fatal", bool(jobs),
            "tabel csms_* ada" if jobs else "tabel csms_ai_evaluation_job belum ada: jalankan backend sekali (sinkronisasi skema)", t0)
    except Exception as e:
        add("Database", "fatal", False, f"{target} tidak terjangkau: {type(e).__name__}: {e}", t0)


def check_uploads():
    t0 = time.time()
    d = UPLOADS_DIR if os.path.isabs(UPLOADS_DIR) else os.path.abspath(os.path.join(BASE_DIR, UPLOADS_DIR))
    ok = os.path.isdir(d) and os.access(d, os.R_OK)
    add("Uploads", "fatal", ok, d + (" dapat dibaca" if ok else " tidak ada / tidak dapat dibaca"), t0)


def check_llm():
    from engine.providers.provider_factory import get_provider
    for role, label in (("reasoning_model", "LLM juri"), ("consensus_model", "LLM konsensus"), ("vision_model", "Vision OCR")):
        t0 = time.time()
        try:
            p = get_provider(role=role)
            url = getattr(p, "endpoint", None) or getattr(p, "chat_url", None) or ""
            root = url.split("/v1")[0]
            r = requests.get(f"{root}/v1/models", timeout=3)
            add(label, "warn", r.status_code == 200, f"{root} HTTP {r.status_code}", t0)
        except Exception as e:
            add(label, "warn", False, f"tidak terjangkau ({type(e).__name__})", t0)
    t0 = time.time()
    has_openai = bool(os.getenv("OPENAI_API_KEY"))
    add("OpenAI cadangan", "warn", has_openai,
        "OPENAI_API_KEY diset" if has_openai else "tidak diset (tidak ada cadangan bila LLM internal mati)", t0)


def check_tools():
    t0 = time.time()
    tool = next((t for t in ("unrar", "unar", "bsdtar") if shutil.which(t)), None)
    add("RAR", "warn", bool(tool), tool or "unrar/unar tidak ada: lampiran .rar tidak bisa dibaca", t0)


def main() -> int:
    asyncio.run(check_db())
    check_uploads()
    check_llm()
    check_tools()
    print("[preflight] csms-ai")
    fatal = False
    for name, level, ok, msg, ms in results:
        tag = "OK  " if ok else ("FAIL" if level == "fatal" else "WARN")
        fatal = fatal or (not ok and level == "fatal")
        print(f"  {tag}  {name:<16} {msg} ({ms} ms)")
    print("[preflight] GAGAL" if fatal else "[preflight] SIAP")
    return 1 if fatal else 0


if __name__ == "__main__":
    sys.exit(main())
