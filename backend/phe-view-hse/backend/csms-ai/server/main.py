import json
import os
import sys
import traceback
import re
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import uvicorn
import asyncio
from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel

from server.config import CSMS_AI_HOST, CSMS_AI_PORT, UPLOADS_DIR
from server.db import get_pool, close_pool
from server.notify import notify
from server.reasoning_format import format_reasoning


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    pool = await get_pool()
    # Jobs left 'processing' by a crashed/restarted server will never finish: close them
    # so the folder is not locked (HTTP 409) forever.
    async with pool.acquire() as conn:
        # Jobs interrupted by a restart are resumed: elements already scored by that job are skipped
        # and extracted files come from the cache, so the run continues where it stopped.
        n = await conn.execute(
            """UPDATE csms_ai_evaluation_job
               SET status = 'queued', progress_message = 'Dilanjutkan setelah server dimulai ulang'
               WHERE status = 'processing'"""
        )
        await conn.execute(
            """UPDATE csms_contract_folder SET ai_reasoning = NULL
               WHERE ai_reasoning LIKE 'PROCESSING:%'"""
        )
        # Jobs accepted but still 'queued' when the server stopped (restart, pm2 memory limit) were
        # never started and nobody would pick them up again: resume recent ones, expire old ones.
        await conn.execute(
            """UPDATE csms_ai_evaluation_job
               SET status = 'failed', error_message = 'Expired in queue', completed_at = NOW()
               WHERE status = 'queued' AND created_at < NOW() - INTERVAL '24 hours'"""
        )
        # Rubric (kriteria penilaian Excel): create tables and load the bundled version when none is active
        try:
            from server import rubric
            seeded = await rubric.ensure_seeded(conn)
            if seeded:
                print(f"[CSMS-AI] Rubric MARINE seeded: version {seeded['version']}")
        except Exception as e:
            print(f"[CSMS-AI] Warning: rubric not seeded: {e}")
        queued = await conn.fetch(
            """SELECT id, contract_folder_id FROM csms_ai_evaluation_job
               WHERE status = 'queued' ORDER BY created_at"""
        )
    for job in queued:
        task = asyncio.create_task(_process_evaluation(str(job["id"]), str(job["contract_folder_id"])))
        _BACKGROUND.add(task)
        task.add_done_callback(_BACKGROUND.discard)
    print(f"[CSMS-AI] Server started, DB pool ready ({n}); resumed {len(queued)} queued job(s)")
    yield
    await close_pool()
    print("[CSMS-AI] Server stopped, DB pool closed")


app = FastAPI(
    title="CSMS-AI Evaluation Server",
    version="1.0.0",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

# One evaluation at a time by default: keeps LLM/OCR load predictable.
_EVAL_SEMAPHORE = asyncio.Semaphore(int(os.getenv("CSMS_AI_CONCURRENCY", "1")))
# A single hung evaluation must not block the queue forever.
_JOB_TIMEOUT_MIN = int(os.getenv("CSMS_AI_JOB_TIMEOUT_MIN", "90"))
# Evidence chunks are matched by file id, so their embeddings are not needed for scoring (saves 20-70 s
# per element of embedding API calls). Set CSMS_AI_EMBED_CHUNKS=1 to compute them anyway.
_EMBED_CHUNKS = os.getenv("CSMS_AI_EMBED_CHUNKS", "0") == "1"
# Characters of document text given to each juror for one element, shared fairly between its files.
_EVIDENCE_BUDGET = int(os.getenv("CSMS_AI_EVIDENCE_CHARS", "34000"))
# Fast mode: important parts only, hard limit per element; thorough mode: whole documents, 30 min is only a
# reference (never fails an element), the job cap is just a safety net.
_FAST_ELEMENT_MIN = int(os.getenv("CSMS_AI_FAST_ELEMENT_MIN", "10"))
_FAST_EVIDENCE_BUDGET = int(os.getenv("CSMS_AI_FAST_EVIDENCE_CHARS", "12000"))
_THOROUGH_JOB_CAP_MIN = int(os.getenv("CSMS_AI_THOROUGH_JOB_CAP_MIN", "1440"))
# Keeps references to tasks created outside a request (startup resume) so they are not GC'd.
_BACKGROUND = set()


class JobCancelled(Exception):
    """The job was closed from outside (cancelled by a user / reaped) while it was running."""


class EvaluateRequest(BaseModel):
    jobId: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

_vision_cache = {"at": 0.0, "online": None}


async def _vision_online() -> bool:
    """Is the OCR vision model (qwen3-vl) reachable? Cached 60 s; offline means OCR falls back to PaddleOCR."""
    import time
    if time.time() - _vision_cache["at"] < 60 and _vision_cache["online"] is not None:
        return _vision_cache["online"]
    from engine.extractors.page_ocr import _vision_config
    url, _ = _vision_config()
    ok = False
    if url:
        import requests
        base = url.split("/v1/")[0]
        try:
            r = await asyncio.to_thread(requests.get, f"{base}/v1/models", timeout=3)
            ok = r.status_code < 500
        except Exception:
            ok = False
    _vision_cache.update(at=time.time(), online=ok)
    return ok


_llm_cache = {"at": 0.0, "online": None}


async def _llm_online() -> bool:
    """Is the reasoning LLM endpoint reachable? Cached 60 s."""
    import time
    if time.time() - _llm_cache["at"] < 60 and _llm_cache["online"] is not None:
        return _llm_cache["online"]
    ok = False
    try:
        from engine.providers.provider_factory import get_provider
        p = get_provider(role="reasoning_model")
        url = getattr(p, "endpoint", None) or getattr(p, "chat_url", None) or ""
        if url:
            import requests
            root = url.split("/v1")[0]
            r = await asyncio.to_thread(requests.get, f"{root}/v1/models", timeout=3)
            ok = r.status_code == 200
    except Exception:
        ok = False
    _llm_cache.update(at=time.time(), online=ok)
    return ok


async def _db_online() -> bool:
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await asyncio.wait_for(conn.fetchval("SELECT 1"), timeout=2)
        return True
    except Exception:
        return False


def _uploads_abs() -> str:
    if os.path.isabs(UPLOADS_DIR):
        return UPLOADS_DIR
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", UPLOADS_DIR))


@app.get("/health")
async def health():
    """200 bila DB sehat, 503 bila tidak. Kunci lama (status, rar, vision) dipertahankan."""
    from fastapi.responses import JSONResponse
    from engine.extractors.archive_extractor import RAR_SUPPORTED
    uploads_dir = _uploads_abs()
    db = await _db_online()
    body = {
        "status": "ok" if db else "error",
        "rar": RAR_SUPPORTED,
        "vision": await _vision_online(),
        "llm": await _llm_online(),
        "db": db,
        "uploads": os.path.isdir(uploads_dir) and os.access(uploads_dir, os.R_OK),
        "uploads_dir": uploads_dir,
    }
    return JSONResponse(body, status_code=200 if db else 503)


class RubricImportRequest(BaseModel):
    data_b64: str
    filename: str = ""
    label: str = ""
    rubric_type: str = "marine"
    created_by: str | None = None


@app.post("/rubric/import")
async def rubric_import(req: RubricImportRequest):
    """Excel (same sheet/columns as the knowledge-base file) -> new active rubric version."""
    import base64
    from server import rubric
    try:
        items = rubric.parse_excel(base64.b64decode(req.data_b64))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Berkas Excel tidak dapat dibaca: {type(e).__name__}")
    pool = await get_pool()
    async with pool.acquire() as conn:
        await rubric.ensure_tables(conn)
        saved = await rubric.save_version(conn, items, req.rubric_type, req.label, req.filename, req.created_by)
    return {**saved, "items": len(items)}


@app.get("/rubric/export")
async def rubric_export(version_id: str | None = None, rubric_type: str = "marine"):
    """Rubric version (active by default) -> Excel, exactly the import format."""
    from fastapi import Response
    from server import rubric
    pool = await get_pool()
    async with pool.acquire() as conn:
        vid = version_id or await conn.fetchval(
            "SELECT id::text FROM csms_ai_rubric_version WHERE rubric_type = $1 AND is_active", rubric_type)
        if not vid:
            raise HTTPException(status_code=404, detail="Rubrik tidak ditemukan")
        rows = await conn.fetch(
            f"SELECT {', '.join(rubric.COLUMNS)} FROM csms_ai_rubric_item WHERE version_id = $1::uuid "
            "ORDER BY string_to_array(no, '.')::int[]", vid)
    data = rubric.export_excel([dict(r) for r in rows])
    return Response(content=data, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")


@app.get("/jobs/{job_id}")
async def get_job(job_id: str):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """SELECT id, contract_folder_id, status, progress_message,
                      error_message, juror_scores, model_used,
                      started_at, completed_at, created_at
               FROM csms_ai_evaluation_job WHERE id = $1""",
            job_id,
        )
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "jobId": str(row["id"]),
        "contractFolderId": str(row["contract_folder_id"]),
        "status": row["status"],
        "progressMessage": row["progress_message"],
        "errorMessage": row["error_message"],
        "jurorScores": json.loads(row["juror_scores"]) if row["juror_scores"] else None,
        "modelUsed": row["model_used"],
        "startedAt": row["started_at"].isoformat() if row["started_at"] else None,
        "completedAt": row["completed_at"].isoformat() if row["completed_at"] else None,
        "createdAt": row["created_at"].isoformat() if row["created_at"] else None,
    }


@app.post("/evaluate")
async def evaluate(req: EvaluateRequest, bg: BackgroundTasks):
    pool = await get_pool()

    # Validate job exists and is queued
    async with pool.acquire() as conn:
        job = await conn.fetchrow(
            """SELECT id, contract_folder_id, status
               FROM csms_ai_evaluation_job WHERE id = $1""",
            req.jobId,
        )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] != "queued":
        raise HTTPException(status_code=409, detail=f"Job already {job['status']}")

    # Kick off background processing
    bg.add_task(_process_evaluation, req.jobId, str(job["contract_folder_id"]))

    return {"jobId": req.jobId, "status": "processing"}


# ---------------------------------------------------------------------------
# Background evaluation pipeline & score recalculation helpers
# ---------------------------------------------------------------------------

async def recalculate_contract_scores(contract_id: str, pool):
    # 1. Fetch all folders for the contract
    async with pool.acquire() as conn:
        folders = await conn.fetch(
            """SELECT id, parent_id, name, file_type, depth, score, status 
               FROM csms_contract_folder 
               WHERE contract_id = $1""",
            contract_id,
        )
    
    # Convert to dictionary for easy access and manipulation
    folder_dict = {}
    for f in folders:
        folder_dict[str(f["id"])] = {
            "id": str(f["id"]),
            "parent_id": str(f["parent_id"]) if f["parent_id"] else None,
            "name": f["name"],
            "file_type": f["file_type"],
            "depth": f["depth"],
            "score": float(f["score"]) if f["score"] is not None else 0.0,
            "status": f["status"] or "pending",
            "children": []
        }
    
    # Build children links
    for fid, f in folder_dict.items():
        if f["parent_id"] and f["parent_id"] in folder_dict:
            folder_dict[f["parent_id"]]["children"].append(f)
    
    # Sort folders by depth in descending order so we process deeper folders first.
    sorted_folders = sorted(folder_dict.values(), key=lambda x: x["depth"], reverse=True)
    
    # Track which folders need DB updates
    updated_folders = {}

    for f in sorted_folders:
        # We only calculate score/status if it's a folder and NOT a leaf scoreable folder
        is_scoreable_leaf = bool(re.match(r"^[12]\s", f["name"]) or re.match(r"^[3-8]\.\d+", f["name"]))
        
        if f["file_type"] == "folder" and not is_scoreable_leaf:
            children = f["children"]
            if not children:
                continue
            
            if f["depth"] == 0:
                # At depth 0, sum depth 2 children scores and divide by active depth 2 children count, then scale to 100
                total_element_score = 0.0
                active_elements_count = 0
                for child in children:
                    for element in child["children"]:
                        element_score = element["score"]
                        if element_score != -1:
                            total_element_score += element_score
                            active_elements_count += 1
                
                divisor = active_elements_count if active_elements_count > 0 else 8
                calculated_score = (total_element_score / divisor) * 10.0
                rounded_score = round(calculated_score, 1)
                
                f["score"] = rounded_score
                f["status"] = "accept" if rounded_score > 0 else "reject"
                updated_folders[f["id"]] = {"score": f["score"], "status": f["status"]}
                
            elif f["depth"] == 1:
                total_score = 0.0
                has_active_child = False
                for child in children:
                    child_score = child["score"]
                    if child_score != -1:
                        total_score += child_score
                        has_active_child = True
                
                f["score"] = total_score if has_active_child else -1.0
                
                child_statuses = [child["status"] for child in children if child["score"] != -1]
                if not child_statuses:
                    f["status"] = "pending"
                elif "revision" in child_statuses:
                    f["status"] = "revision"
                elif "reject" in child_statuses:
                    f["status"] = "reject"
                elif all(s == "accept" for s in child_statuses):
                    f["status"] = "accept"
                else:
                    f["status"] = "pending"
                    
                updated_folders[f["id"]] = {"score": f["score"], "status": f["status"]}
                
            elif f["depth"] == 2:
                subfolders = [c for c in children if c["file_type"] == "folder"]
                active_subfolders = [c for c in subfolders if c["score"] != -1]
                
                if subfolders:
                    if not active_subfolders:
                        f["score"] = -1.0
                        f["status"] = "pending"
                    else:
                        active_total_score = sum(c["score"] for c in active_subfolders)
                        calculated_score = active_total_score / len(active_subfolders)
                        rounded_score = round(calculated_score, 1)
                        f["score"] = rounded_score
                        
                        child_statuses = [c["status"] for c in active_subfolders]
                        if "revision" in child_statuses:
                            f["status"] = "revision"
                        elif "reject" in child_statuses:
                            f["status"] = "reject"
                        elif all(s == "accept" for s in child_statuses):
                            f["status"] = "accept"
                        else:
                            f["status"] = "pending"
                            
                    updated_folders[f["id"]] = {"score": f["score"], "status": f["status"]}
                    
    # Bulk update to database
    async with pool.acquire() as conn:
        for fid, val in updated_folders.items():
            await conn.execute(
                """UPDATE csms_contract_folder 
                   SET score = $1, status = $2, updated_at = NOW() 
                   WHERE id = $3""",
                str(val["score"]),
                val["status"],
                fid,
            )


async def recalculate_contract_ai_scores(contract_id: str, pool):
    # 1. Fetch all folders for the contract
    async with pool.acquire() as conn:
        folders = await conn.fetch(
            """SELECT id, parent_id, name, file_type, depth, ai_score, ai_status 
               FROM csms_contract_folder 
               WHERE contract_id = $1""",
            contract_id,
        )
    
    # Convert to dictionary for easy access and manipulation
    folder_dict = {}
    for f in folders:
        folder_dict[str(f["id"])] = {
            "id": str(f["id"]),
            "parent_id": str(f["parent_id"]) if f["parent_id"] else None,
            "name": f["name"],
            "file_type": f["file_type"],
            "depth": f["depth"],
            "score": float(f["ai_score"]) if f["ai_score"] is not None else 0.0,
            "status": f["ai_status"] or "pending",
            "children": []
        }
    
    # Build children links
    for fid, f in folder_dict.items():
        if f["parent_id"] and f["parent_id"] in folder_dict:
            folder_dict[f["parent_id"]]["children"].append(f)
    
    # Sort folders by depth in descending order so we process deeper folders first.
    sorted_folders = sorted(folder_dict.values(), key=lambda x: x["depth"], reverse=True)
    
    # Track which folders need DB updates
    updated_folders = {}

    for f in sorted_folders:
        # We only calculate score/status if it's a folder and NOT a leaf scoreable folder
        is_scoreable_leaf = bool(re.match(r"^[12]\s", f["name"]) or re.match(r"^[3-8]\.\d+", f["name"]))
        
        if f["file_type"] == "folder" and not is_scoreable_leaf:
            children = f["children"]
            if not children:
                continue
            
            if f["depth"] == 0:
                # At depth 0, sum depth 2 children scores and divide by active depth 2 children count, then scale to 100
                total_element_score = 0.0
                active_elements_count = 0
                for child in children:
                    for element in child["children"]:
                        element_score = element["score"]
                        if element_score != -1:
                            total_element_score += element_score
                            active_elements_count += 1
                
                divisor = active_elements_count if active_elements_count > 0 else 8
                calculated_score = (total_element_score / divisor) * 10.0
                rounded_score = round(calculated_score, 1)
                
                f["score"] = rounded_score
                f["status"] = "accept" if rounded_score > 0 else "reject"
                updated_folders[f["id"]] = {"score": f["score"], "status": f["status"]}
                
            elif f["depth"] == 1:
                total_score = 0.0
                has_active_child = False
                for child in children:
                    child_score = child["score"]
                    if child_score != -1:
                        total_score += child_score
                        has_active_child = True
                
                f["score"] = total_score if has_active_child else -1.0
                
                child_statuses = [child["status"] for child in children if child["score"] != -1]
                if not child_statuses:
                    f["status"] = "pending"
                elif "revision" in child_statuses:
                    f["status"] = "revision"
                elif "reject" in child_statuses:
                    f["status"] = "reject"
                elif all(s == "accept" for s in child_statuses):
                    f["status"] = "accept"
                else:
                    f["status"] = "pending"
                    
                updated_folders[f["id"]] = {"score": f["score"], "status": f["status"]}
                
            elif f["depth"] == 2:
                subfolders = [c for c in children if c["file_type"] == "folder"]
                active_subfolders = [c for c in subfolders if c["score"] != -1]
                
                if subfolders:
                    if not active_subfolders:
                        f["score"] = -1.0
                        f["status"] = "pending"
                    else:
                        active_total_score = sum(c["score"] for c in active_subfolders)
                        calculated_score = active_total_score / len(active_subfolders)
                        rounded_score = round(calculated_score, 1)
                        f["score"] = rounded_score
                        
                        child_statuses = [c["status"] for c in active_subfolders]
                        if "revision" in child_statuses:
                            f["status"] = "revision"
                        elif "reject" in child_statuses:
                            f["status"] = "reject"
                        elif all(s == "accept" for s in child_statuses):
                            f["status"] = "accept"
                        else:
                            f["status"] = "pending"
                            
                    updated_folders[f["id"]] = {"score": f["score"], "status": f["status"]}
                    
    # Bulk update to database
    async with pool.acquire() as conn:
        for fid, val in updated_folders.items():
            await conn.execute(
                """UPDATE csms_contract_folder 
                   SET ai_score = $1, ai_status = $2, ai_reasoning = NULL, updated_at = NOW() 
                   WHERE id = $3""",
                str(val["score"]),
                val["status"],
                fid,
            )


def _build_evidence(evidence_chunks, files_rows, budget: int):
    """Per-element evidence for the jurors: the list of every submitted file (incl. unreadable ones) and the
    text of each file, each file getting a fair share of `budget` characters (unused share is redistributed)."""
    by_file = {}
    for c in evidence_chunks:
        name = os.path.basename(c["file_path"].replace("\\", "/"))
        by_file.setdefault(name, []).append(c["content"])
    texts = {name: "\n".join(parts) for name, parts in by_file.items()}
    remaining, files_left = budget, len(texts)
    docs = []
    for name in sorted(texts, key=lambda n: len(texts[n])):  # short files first, their leftover flows to long ones
        share = remaining // max(files_left, 1)
        t = texts[name]
        if len(t) > share:
            t = t[:share] + "\n...[dipotong: dokumen panjang]"
        docs.append({"filename": name, "extracted_text_content": t})
        remaining -= min(len(texts[name]), share)
        files_left -= 1
    inventory = sorted({os.path.basename(str(r["file_path"])) for r in files_rows if r["file_path"]})
    return {
        "SUBMITTED_FILES": inventory,
        "EXTRACTED_DOCUMENT_TEXTS": docs,
        "document_types_found": sorted({c["metadata"].get("extractor_used", "unknown") for c in evidence_chunks}),
    }


def _juror_knowledge(knowledge):
    """What the jurors see as 'category definition' (the raw rubric item stays out of the prompt)."""
    return {k: v for k, v in knowledge.items() if k != "rubric_item"}


def _run_panel(knowledge, aggregated_evidence, mode: str = "thorough"):
    """Blocking LLM work (3 jurors + consensus). Runs in a worker thread so the
    event loop (/health, /jobs) stays responsive. Raises LLMError if a juror fails."""
    from engine.jurors.compliance_juror import ComplianceJuror
    from engine.jurors.evidence_juror import EvidenceJuror
    from engine.jurors.hse_juror import HSEJuror
    from engine.consensus.consensus_agent import ConsensusAgent

    import copy
    from concurrent.futures import ThreadPoolExecutor

    if mode == "fast":
        # one panel call: the compliance juror judges alone; no consensus round
        panel = ComplianceJuror(role="reasoning_model")
        res = panel.evaluate(knowledge, aggregated_evidence, {})
        consensus_result = {
            "recommended_score": res.get("score"),
            "confidence": res.get("confidence", 0.0),
            "reasoning": " ".join(str(r) for r in (res.get("reasoning") or [])[:2]) or "Penilaian cepat oleh panel AI.",
            "recommendations_for_excellent_score": {"recommendations": res.get("recommendations") or []},
        }
        model = getattr(panel.provider, "last_model_used", None)
        return res, None, None, consensus_result, {model} if model else set()

    comp_juror = ComplianceJuror(role="reasoning_model")
    ev_juror = EvidenceJuror(role="reasoning_model")
    hse_juror = HSEJuror(role="reasoning_model")
    # independent calls -> run them concurrently (each juror gets its own copy: jurors trim texts in place)
    with ThreadPoolExecutor(max_workers=3) as ex:
        futures = [ex.submit(j.evaluate, knowledge, copy.deepcopy(aggregated_evidence), {}) for j in (comp_juror, ev_juror, hse_juror)]
        comp_res, ev_res, hse_res = [f.result() for f in futures]
    consensus = ConsensusAgent(role="consensus_model")
    consensus_result = consensus.resolve(comp_res, ev_res, hse_res, knowledge)
    models = {getattr(j.provider, "last_model_used", None) for j in (comp_juror, ev_juror, hse_juror, consensus)}
    return comp_res, ev_res, hse_res, consensus_result, {m for m in models if m}


async def _element_timed_out(pool, subfolder_id: str, name: str, failed: list):
    failed.append(f"{name} (melebihi batas waktu mode cepat)")
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE csms_contract_folder SET ai_reasoning = $1, updated_at = NOW() WHERE id = $2",
            f"AI tidak dapat menilai: melebihi batas waktu {_FAST_ELEMENT_MIN} menit (mode cepat). Gunakan mode Menyeluruh.",
            subfolder_id,
        )


async def _job_status(job_id: str):
    pool = await get_pool()
    async with pool.acquire() as conn:
        return await conn.fetchval("SELECT status FROM csms_ai_evaluation_job WHERE id = $1", job_id)


async def _fail_job(job_id: str, contract_folder_id: str, message: str):
    """Close a still-active job as failed, clear its PROCESSING markers and tell the UI."""
    import uuid
    pool = await get_pool()
    async with pool.acquire() as conn:
        closed = await conn.fetchval(
            """UPDATE csms_ai_evaluation_job
               SET status = 'failed', error_message = $1, completed_at = NOW()
               WHERE id = $2 AND status IN ('queued', 'processing') RETURNING id""",
            message, job_id,
        )
        await conn.execute(
            """UPDATE csms_contract_folder SET ai_reasoning = NULL
               WHERE ai_reasoning LIKE 'PROCESSING:%'
                 AND path <@ (SELECT path FROM csms_contract_folder WHERE id = $1)::ltree""",
            uuid.UUID(contract_folder_id),
        )
        if closed:
            await notify(conn,
                json.dumps({"folderId": contract_folder_id, "jobId": job_id, "status": "failed", "errorMessage": message}),
            )


async def _process_evaluation(job_id: str, contract_folder_id: str):
    if _EVAL_SEMAPHORE.locked():
        # Say so instead of leaving the initial "Job created, waiting for processing".
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE csms_ai_evaluation_job SET progress_message = 'Menunggu antrian evaluasi...' WHERE id = $1 AND status = 'queued'",
                job_id,
            )
    async with _EVAL_SEMAPHORE:
        status = await _job_status(job_id)
        if status != "queued":
            print(f"[CSMS-AI] Skip job {job_id}: status is {status} (cancelled or already handled)")
            return
        pool = await get_pool()
        async with pool.acquire() as conn:
            try:
                mode = await conn.fetchval("SELECT mode FROM csms_ai_evaluation_job WHERE id = $1", job_id) or "thorough"
            except Exception:
                mode = "thorough"
        cap_min = (29 * _FAST_ELEMENT_MIN + 15) if mode == "fast" else max(_JOB_TIMEOUT_MIN, _THOROUGH_JOB_CAP_MIN)
        try:
            await asyncio.wait_for(_process_evaluation_locked(job_id, contract_folder_id), timeout=cap_min * 60)
        except asyncio.TimeoutError:
            print(f"[CSMS-AI] Job {job_id} exceeded {cap_min} min, closing it")
            await _fail_job(job_id, contract_folder_id, f"Melebihi batas waktu {cap_min} menit")


from server.schema_ddl import TRIAL_DDL  # noqa: E402  (dipakai juga oleh server.scripts.ensure_schema)


async def _finish_trial(job_id: str, root_id: str, rubric_version_id: str, job_started, pool):
    """Copy the trial's element results next to the evaluator's final score, then restore the folders' AI results."""
    import uuid
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                """INSERT INTO csms_ai_trial_result (job_id, folder_id, rubric_version_id, element_code, ai_score, ai_status, confidence,
                                                   evaluator_score, evaluator_status)
                   SELECT $1::uuid, f.id, $2::uuid, split_part(f.name, ' ', 1), f.ai_score, f.ai_status,
                          nullif(replace(substring(split_part(f.ai_reasoning, E'\n', 2) from 'keyakinan: ([0-9.,]+)'), ',', '.'), '')::numeric,
                          f.score, f.status
                     FROM csms_contract_folder f
                    WHERE f.path <@ (SELECT path FROM csms_contract_folder WHERE id = $3)::ltree AND f.file_type = 'folder'
                      AND f.ai_processed_at >= $4 AND f.ai_reasoning LIKE 'HASIL PENILAIAN AI%'
                   ON CONFLICT (job_id, folder_id) DO NOTHING""",
                job_id, rubric_version_id, uuid.UUID(root_id), job_started)
            await conn.execute(
                """UPDATE csms_contract_folder f SET ai_score = s.ai_score, ai_status = s.ai_status::"StatusContractEnum", ai_reasoning = s.ai_reasoning,
                          ai_processed_at = s.ai_processed_at
                     FROM csms_ai_trial_snapshot s WHERE s.job_id = $1::uuid AND s.folder_id = f.id""", job_id)


async def _process_evaluation_locked(job_id: str, contract_folder_id: str):
    """Full pipeline: extraction → embedding → RAG → jurors → consensus → save for each subfolder."""
    pool = await get_pool()
    models_used = set()
    failed_subfolders = []

    try:
        # Mark as processing
        import uuid
        async with pool.acquire() as conn:
            # only a job that is still open: a job cancelled right after it was queued must stay cancelled
            started = await conn.fetchval(
                """UPDATE csms_ai_evaluation_job
                   SET status = 'processing', started_at = coalesce(started_at, $1)
                   WHERE id = $2 AND status IN ('queued', 'processing') RETURNING id""",
                datetime.now(timezone.utc),
                job_id,
            )
            if not started:
                print(f"[CSMS-AI] Job {job_id} was cancelled/closed before it started; skipped")
                return
            try:
                job_row = await conn.fetchrow("SELECT started_at, mode FROM csms_ai_evaluation_job WHERE id = $1", job_id)
            except Exception:  # 'mode' column not created yet (backend not restarted after upgrade)
                job_row = await conn.fetchrow("SELECT started_at FROM csms_ai_evaluation_job WHERE id = $1", job_id)
            mode = (job_row["mode"] if job_row and "mode" in job_row.keys() else None) or "thorough"
            job_started = job_row["started_at"] if job_row else None
            # resume: elements this job already scored before an interruption
            done_ids = {str(r["id"]) for r in await conn.fetch(
                """SELECT f.id FROM csms_contract_folder f
                    WHERE f.path <@ (SELECT path FROM csms_contract_folder WHERE id = $1)::ltree
                      AND f.file_type = 'folder' AND f.ai_processed_at >= $2""",
                uuid.UUID(contract_folder_id), job_started)} if job_started else set()
            # Granular run: only these elements/groups of the assessment folder (NULL = the whole folder).
            try:
                target_ids = await conn.fetchval(
                    "SELECT target_folder_ids FROM csms_ai_evaluation_job WHERE id = $1", job_id
                )
            except Exception:  # column not created yet (backend not restarted after upgrade)
                target_ids = None
            target_ids = [str(t) for t in (target_ids or [])]
            # P4 trial run: score with a given (inactive) rubric version on reference folders, keep their AI results
            try:
                trial_row = await conn.fetchrow("SELECT trial, rubric_version_id::text AS rv FROM csms_ai_evaluation_job WHERE id = $1", job_id)
            except Exception:
                trial_row = None
            trial = bool(trial_row and trial_row["trial"])
            rubric_version_id = trial_row["rv"] if trial_row else None
            if trial:
                await conn.execute(TRIAL_DDL)
                await conn.execute(
                    """INSERT INTO csms_ai_trial_snapshot (job_id, folder_id, ai_score, ai_status, ai_reasoning, ai_processed_at)
                       SELECT $1::uuid, f.id, f.ai_score, f.ai_status, f.ai_reasoning, f.ai_processed_at FROM csms_contract_folder f
                        WHERE f.path <@ (SELECT path FROM csms_contract_folder WHERE id = $2)::ltree AND f.file_type = 'folder'
                       ON CONFLICT (job_id, folder_id) DO NOTHING""",
                    job_id, uuid.UUID(contract_folder_id))
            # Extraction cache: chunks of unchanged files are reused (a re-upload gets a new file id);
            # only chunks written by an older extractor version are dropped and re-extracted.
            from server.pipeline.extraction import EXTRACTOR_VERSION
            await conn.execute(
                "DELETE FROM csms_evidence_chunk WHERE contract_folder_id = $1 AND NOT (coalesce(metadata->>'xv', '') = ANY($2::text[]))",
                uuid.UUID(contract_folder_id),
                [EXTRACTOR_VERSION, EXTRACTOR_VERSION + "f"] if mode == "fast" else [EXTRACTOR_VERSION],
            )
        # --- Get folder info ---
        async with pool.acquire() as conn:
            folder = await conn.fetchrow(
                """SELECT name, file_path, contract_id
                   FROM csms_contract_folder WHERE id = $1""",
                contract_folder_id,
            )

        if not folder:
            raise ValueError(f"Folder {contract_folder_id} not found")

        # --- Pre-fetch Subfolders to mark first element as processing immediately ---
        async with pool.acquire() as conn:
            subfolders = await conn.fetch(
                """SELECT id, name, path FROM csms_contract_folder f
                   WHERE f.contract_id = $1 AND f.file_type = 'folder' 
                     AND f.path <@ (SELECT path FROM csms_contract_folder WHERE id = $2)::ltree
                   ORDER BY f.path""",
                folder["contract_id"],
                contract_folder_id,
            )

        OFFICIAL_SCOREABLE_NAMES = {
            "1 Kepemimpinan dan Komitmen",
            "2 Kebijakan dan Sasaran Strategis K3LL",
            "3.1 Struktur Organisasi untuk Pengelolaan K3LL",
            "3.2 Pelatihan K3LL untuk para Manajer, pengawas (supervisor) dan pemegang jabatan penting K3LL",
            "3.3 Pelatihan K3LL Umum (pada seluruh pekerja dan pihak yang terkait)",
            "3.4 Pemenuhan Kompetensi Teknis dan K3LL",
            "3.5 Pengelolaan K3LL kontraktor (Mitra Kerja)",
            "3.6 Peraturan dan Standar K3LL",
            "4.1 Penilaian dan Pengendalian Risiko*",
            "4.2 Bahaya Terhadap Kesehatan Kerja",
            "4.3 Bahaya Terhadap Keselamatan Kerja",
            "4.4 Bahaya Terhadap Kegiatan Logistik",
            "4.5 Bahaya Terhadap Lingkungan",
            "4.6 Bahaya Terhadap Keamanan",
            "4.7 Bahaya Terhadap Aspek Sosial",
            "4.8 APD*",
            "4.8 Alat Pelindung Diri (APD)",
            "5.1 Manual Operasi K3LL*",
            "5.2 Kehandalan Infrastruktur dan Peralatan",
            "5.3 Manajemen Perubahan",
            "5.4 Implementasi Tanggap Darurat",
            "6.1 Sistem pemantauan kinerja K3LL secara aktif",
            "6.2 lndikator kinerja K3LL",
            "6.3 Pemantauan kinerja K3LL (Butir a-g)",
            "6.4 Investigasi dan tindak lanjut insiden K3LL",
            "6.5 Insiden yang harus dilaporkan sesuai undang-undang dan catatan ketidakpatuhan",
            "7.1 Audit",
            "7.2 Tinjauan Manajemen K3LL",
            "8.1 Sertifikasi sistem pengelolaan K3LL",
            "8.2 Ciri-ciri tambahan sistem Pengelolaan K3LL"
        }

        import re
        def is_scoreable(name: str) -> bool:
            return name in OFFICIAL_SCOREABLE_NAMES

        def get_folder_sort_key(sf):
            name = sf["name"]
            match_dot = re.match(r'^(\d+(?:\.\d+)*)', name)
            if match_dot:
                return [int(p) for p in match_dot.group(1).split('.')]
            match_space = re.match(r'^(\d+)\s', name)
            if match_space:
                return [int(match_space.group(1))]
            return [999]

        scoreable_subfolders = [sf for sf in subfolders if is_scoreable(sf["name"])]
        if target_ids:
            # keep the target folders themselves and everything below them (a group like "3" -> 3.1..3.6)
            target_paths = [str(sf["path"]) for sf in subfolders if str(sf["id"]) in target_ids]
            scoreable_subfolders = [
                sf for sf in scoreable_subfolders
                if any(str(sf["path"]) == tp or str(sf["path"]).startswith(tp + ".") for tp in target_paths)
            ]
            print(f"[CSMS-AI] Granular run: {len(scoreable_subfolders)} element(s) of {len(target_ids)} target(s)")
        scoreable_subfolders.sort(key=get_folder_sort_key)
        total_subfolders = len(scoreable_subfolders)
        first_subfolder_id = str(scoreable_subfolders[0]["id"]) if scoreable_subfolders else None

        # Build physical path: uploads/csms/{contract_id}/{folder_id}/
        if os.path.isabs(UPLOADS_DIR):
            uploads_root = os.path.join(UPLOADS_DIR, "csms")
        else:
            uploads_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", UPLOADS_DIR, "csms"))
        folder_path = os.path.join(uploads_root, contract_folder_id)
        if not os.path.exists(folder_path):
            # Fallback 1: try contract_id subfolder
            folder_path = os.path.join(uploads_root, str(folder["contract_id"]), contract_folder_id)
        if not os.path.exists(folder_path):
            # Fallback 2: try contracts/contract_id subfolder
            folder_path = os.path.join(uploads_root, "contracts", str(folder["contract_id"]), contract_folder_id)

        if not os.path.exists(folder_path):
            raise ValueError(f"Upload folder not found: {folder_path}")

        # --- Mark first subfolder as starting extraction immediately ---
        if first_subfolder_id:
            async with pool.acquire() as conn:
                await conn.execute(
                    """UPDATE csms_contract_folder 
                       SET ai_reasoning = 'PROCESSING: Mengekstraksi dokumen...', updated_at = NOW() 
                       WHERE id = $1""",
                    first_subfolder_id,
                )

        # --- Stage 3: Retrieve All Subfolders of Contract ---
        print(f"[CSMS-AI] Found {total_subfolders} scoreable subfolders.")

        for idx, subfolder in enumerate(scoreable_subfolders):
            if await _job_status(job_id) != "processing":
                raise JobCancelled()
            subfolder_id = str(subfolder["id"])
            if subfolder_id in done_ids:
                continue  # resumed job: already scored before the interruption
            element_deadline = (asyncio.get_running_loop().time() + _FAST_ELEMENT_MIN * 60) if mode == "fast" else None

            def _left():
                return None if element_deadline is None else max(1.0, element_deadline - asyncio.get_running_loop().time())
            subfolder_name = subfolder["name"]
            subfolder_path = subfolder["path"]

            # 1. Extraction for this subfolder
            progress_msg_extract = f"Extracting subfolder {idx+1}/{total_subfolders}: {subfolder_name}"
            print(f"[CSMS-AI] {progress_msg_extract}")
            async with pool.acquire() as conn:
                await conn.execute(
                    "UPDATE csms_ai_evaluation_job SET progress_message = $1 WHERE id = $2",
                    progress_msg_extract,
                    job_id,
                )
                await notify(conn,
                    json.dumps({
                        "folderId": str(contract_folder_id),
                        "jobId": str(job_id),
                        "status": "processing",
                        "progressMessage": progress_msg_extract
                    })
                )
                await conn.execute(
                    """UPDATE csms_contract_folder 
                       SET ai_reasoning = $1, updated_at = NOW() 
                       WHERE id = $2""",
                    f"PROCESSING: Mengekstraksi dokumen...",
                    subfolder_id,
                )
            
            from server.pipeline.extraction import extract_and_store
            try:
                extraction_result = await asyncio.wait_for(extract_and_store(
                    contract_folder_id,
                    folder_path,
                    job_id,
                    target_subfolder_id=subfolder_id,
                    subfolder_idx=idx+1,
                    total_subfolders=total_subfolders,
                    profile=mode,
                ), timeout=_left())
            except asyncio.TimeoutError:
                await _element_timed_out(pool, subfolder_id, subfolder_name, failed_subfolders)
                continue
            print(f"[CSMS-AI] Extraction for {subfolder_name}: {extraction_result}")

            # 2. Embedding for this subfolder
            progress_msg_embed = f"Embedding subfolder {idx+1}/{total_subfolders}: {subfolder_name}"
            print(f"[CSMS-AI] {progress_msg_embed}")
            async with pool.acquire() as conn:
                await conn.execute(
                    "UPDATE csms_ai_evaluation_job SET progress_message = $1 WHERE id = $2",
                    progress_msg_embed,
                    job_id,
                )
                await notify(conn,
                    json.dumps({
                        "folderId": str(contract_folder_id),
                        "jobId": str(job_id),
                        "status": "processing",
                        "progressMessage": progress_msg_embed
                    })
                )
                await conn.execute(
                    """UPDATE csms_contract_folder 
                       SET ai_reasoning = $1, updated_at = NOW() 
                       WHERE id = $2""",
                    f"PROCESSING: Membuat embedding...",
                    subfolder_id,
                )
            if _EMBED_CHUNKS:
                from server.pipeline.embedding import generate_chunk_embeddings
                embedded_count = await generate_chunk_embeddings(contract_folder_id)
                print(f"[CSMS-AI] Embedded {embedded_count} chunks")

            # 3. Evaluation for this subfolder
            progress_msg = f"Evaluating subfolder {idx+1}/{total_subfolders}: {subfolder_name}"
            print(f"[CSMS-AI] {progress_msg}")
            async with pool.acquire() as conn:
                await conn.execute(
                    "UPDATE csms_ai_evaluation_job SET progress_message = $1 WHERE id = $2",
                    progress_msg,
                    job_id,
                )
                await notify(conn,
                    json.dumps({
                        "folderId": str(contract_folder_id),
                        "jobId": str(job_id),
                        "status": "processing",
                        "progressMessage": progress_msg
                    })
                )
                await conn.execute(
                    """UPDATE csms_contract_folder 
                       SET ai_reasoning = $1, updated_at = NOW() 
                       WHERE id = $2""",
                    f"PROCESSING: Mengevaluasi ({idx+1}/{total_subfolders})...",
                    subfolder_id,
                )

            # Find all files belonging to this subfolder
            async with pool.acquire() as conn:
                files_rows = await conn.fetch(
                    """SELECT id, file_path FROM csms_contract_folder 
                       WHERE contract_id = $1 AND file_type = 'file' 
                         AND path <@ $2::ltree""",
                    folder["contract_id"],
                    subfolder_path,
                )
            subfolder_file_paths = {r["file_path"] for r in files_rows if r["file_path"]}

            from server.pipeline.rag import retrieve_knowledge, retrieve_evidence_chunks
            # Fetch ALL chunks for the contract. We do this inside the loop to ensure we pick up the latest extracted chunks for this subfolder.
            all_evidence_chunks = await retrieve_evidence_chunks(contract_folder_id, limit=50000)

            # Match chunks to this subfolder by file id (first path segment is the file-id
            # directory); basename only as a fallback for legacy flat layouts.
            sub_file_ids = {str(r["id"]) for r in files_rows}
            sub_basenames = {os.path.basename(p.replace("\\", "/")) for p in subfolder_file_paths}
            evidence_chunks = []
            for chunk in all_evidence_chunks:
                norm = chunk["file_path"].replace("\\", "/")
                head = norm.split("/")[0]
                if head in sub_file_ids or (len(head) != 36 and os.path.basename(norm) in sub_basenames):
                    evidence_chunks.append(chunk)

            # Retrieve knowledge matching this element
            knowledge = await retrieve_knowledge(subfolder_name, subfolder_name, rubric_version_id)

            # Files registered in the DB but missing on disk (wrong UPLOADS_DIR, incomplete copy/sync) are a
            # server problem, not a weak submission: report it instead of scoring the element 3.
            missing_on_disk = [
                r for r in files_rows
                if r["file_path"] and not os.path.exists(os.path.join(folder_path, str(r["id"]), r["file_path"]))
            ]
            if subfolder_file_paths and not evidence_chunks and len(missing_on_disk) == len(files_rows):
                print(f"[CSMS-AI] Files missing on disk for '{subfolder_name}' ({len(missing_on_disk)}) under {folder_path}")
                failed_subfolders.append(f"{subfolder_name} (berkas tidak ditemukan di server)")
                async with pool.acquire() as conn:
                    await conn.execute(
                        """UPDATE csms_contract_folder
                           SET ai_reasoning = $1, updated_at = NOW() WHERE id = $2""",
                        f"AI tidak dapat menilai: {len(missing_on_disk)} berkas dokumen tidak ditemukan di server. Hubungi admin.",
                        subfolder_id,
                    )
                continue

            if not evidence_chunks:
                if subfolder_file_paths:
                    # Documents submitted but text extraction failed/yielded no evidence -> Min score 3.0
                    final_score = 3.0
                    ai_status = "reject"
                    
                    reasoning = "Dokumen telah diunggah, tetapi tidak ada teks bukti yang dapat diekstraksi atau diproses oleh AI (diterapkan skor minimum 3)."
                    reasoning_text = format_reasoning(
                        subfolder_name, final_score, ai_status, 0.0, conclusion=reasoning, mode=mode,
                        gaps=["Teks dokumen tidak dapat dibaca (kemungkinan hasil pindai tanpa teks)."],
                        recommendations=["Unggah PDF yang teksnya dapat dicari, atau gambar yang jelas untuk OCR."],
                    )
                else:
                    # No documents uploaded for this element -> score 0
                    final_score = 0.0
                    ai_status = "reject"
                    reasoning = "Tidak ada dokumen bukti yang diunggah untuk elemen ini."
                    reasoning_text = format_reasoning(
                        subfolder_name, final_score, ai_status, 0.0, conclusion=reasoning, mode=mode,
                        gaps=["Belum ada dokumen bukti."],
                        recommendations=["Unggah dokumen bukti yang dipersyaratkan untuk elemen ini."],
                    )
            else:
                # leave room for the rubric (median 7k, max ~19k characters) inside the model context
                rubric_chars = len(json.dumps(_juror_knowledge(knowledge), ensure_ascii=False, default=str))
                budget = _FAST_EVIDENCE_BUDGET if mode == "fast" else max(8000, _EVIDENCE_BUDGET - rubric_chars)
                summaries_text = ''  # thorough mode: jurors quote the per-file summaries (verified against them too)
                rubric_item = knowledge.get("rubric_item")
                if mode != "fast" and rubric_item:
                    from server.pipeline.summarize import summarise_element_files
                    by_file = {}
                    for c in evidence_chunks:
                        norm = c["file_path"].replace("\\", "/")
                        fid = norm.split("/")[0]
                        name = os.path.basename(norm)
                        by_file.setdefault(fid, [name, []])[1].append(c["content"])

                    async def _progress(done, total, fname):
                        async with pool.acquire() as conn:
                            await conn.execute(
                                "UPDATE csms_ai_evaluation_job SET progress_message = $1 WHERE id = $2",
                                f"Evaluating subfolder {idx+1}/{total_subfolders}: {subfolder_name} -> meringkas berkas {done}/{total}",
                                uuid.UUID(job_id),
                            )

                    docs = await summarise_element_files(
                        subfolder_name.split(" ")[0], rubric_item,
                        [(fid, v[0], "\n".join(v[1])) for fid, v in by_file.items()], _progress)
                    summaries_text = '\n'.join(d["extracted_text_content"] for d in docs)
                    evidence_chunks_for_jurors = [
                        {"file_path": d["filename"], "content": d["extracted_text_content"], "metadata": {"extractor_used": "FileSummary"}}
                        for d in docs
                    ]
                    aggregated_evidence = _build_evidence(evidence_chunks_for_jurors, files_rows, budget)
                    aggregated_evidence["CONTENT_TYPE"] = "Ringkasan per berkas terhadap AI CHECKS (berisi kutipan dari dokumen asli)"
                else:
                    aggregated_evidence = _build_evidence(evidence_chunks, files_rows, budget)
                from engine.utils.scoring import snap_to_csms_scale
                try:
                    comp_res, ev_res, hse_res, consensus_result, panel_models = await asyncio.wait_for(
                        asyncio.to_thread(_run_panel, _juror_knowledge(knowledge), aggregated_evidence, mode), timeout=_left()
                    )
                except asyncio.TimeoutError:
                    await _element_timed_out(pool, subfolder_id, subfolder_name, failed_subfolders)
                    continue
                except Exception as llm_err:
                    # AI unavailable for this element: record it honestly, never invent a score.
                    print(f"[CSMS-AI] AI unavailable for '{subfolder_name}': {llm_err}")
                    failed_subfolders.append(subfolder_name)
                    async with pool.acquire() as conn:
                        await conn.execute(
                            """UPDATE csms_contract_folder
                               SET ai_reasoning = $1, updated_at = NOW() WHERE id = $2""",
                            f"AI tidak tersedia untuk elemen ini ({type(llm_err).__name__}). Silakan evaluasi ulang.",
                            subfolder_id,
                        )
                    continue
                models_used |= panel_models
                comp_score = snap_to_csms_scale(comp_res.get("score"))
                ev_score = snap_to_csms_scale(ev_res.get("score")) if ev_res else None
                hse_score = snap_to_csms_scale(hse_res.get("score")) if hse_res else None

                recommended_score = float(consensus_result.get("recommended_score", 0.0))
                # Snapping logic in consensus is: final score snaps to CSMS scale
                final_score = snap_to_csms_scale(recommended_score * 10.0 if recommended_score <= 1.0 else recommended_score)
                
                # Enforce minimum 3 if files exist
                if subfolder_file_paths:
                    final_score = max(3.0, final_score)

                # P1-P3: score from the calibrated rubric checklist, verified quotes, combined confidence
                from server.scoring_rules import apply_rules
                from server.reasoning_format import merge_checks
                panel = {k: v for k, v in {
                    "compliance": {**comp_res, "score": comp_score},
                    "evidence": {**ev_res, "score": ev_score} if ev_res else None,
                    "hse": {**hse_res, "score": hse_score} if hse_res else None,
                }.items() if v}
                ruled = apply_rules(knowledge.get("rubric_item"), panel, final_score, consensus_result.get("confidence", 0.0),
                                    "\n".join(c.get("content") or "" for c in evidence_chunks) + "\n" + summaries_text, merge_checks)
                final_score = max(3.0, ruled["score"]) if subfolder_file_paths else ruled["score"]
                ai_status = "accept" if final_score >= 6 else "revision" if final_score >= 3 else "reject"
                recs = consensus_result.get("recommendations_for_excellent_score") or {}
                conclusion = " ".join([consensus_result.get("reasoning", "Penilaian konsensus selesai."), *ruled["notes"]])
                reasoning_text = format_reasoning(
                    subfolder_name, final_score, ai_status, ruled["confidence"],
                    conclusion=conclusion,
                    jurors=panel,
                    mode=mode,
                    recommendations=recs.get("recommendations"),
                    required_documents=recs.get("required_documents"),
                )

            # Save results to this specific subfolder
            now = datetime.now(timezone.utc)
            async with pool.acquire() as conn:
                await conn.execute(
                    """UPDATE csms_contract_folder
                       SET ai_score = $1,
                           ai_status = $2,
                           ai_reasoning = $3,
                           ai_processed_at = $4
                        WHERE id = $5""",
                    str(final_score),
                    ai_status,
                    reasoning_text,
                    now,
                    subfolder_id,
                )
                
                # Update progress message to notify frontend that this subfolder is done
                await conn.execute(
                    "UPDATE csms_ai_evaluation_job SET progress_message = $1 WHERE id = $2",
                    f"Subfolder completed: {subfolder_name}",
                    uuid.UUID(job_id),
                )
                
                # Send pg_notify for subfolder completion to update UI state in real-time.
                # Note: aiReasoning is deliberately omitted here because Postgres pg_notify has an 8000-byte limit
                # and rich multi-juror reasoning will exceed this limit, causing 'payload string too long'.
                # The frontend and backend fetch full reasoning directly from csms_contract_folder in the database.
                try:
                    subfolder_notification = json.dumps({
                        "folderId": contract_folder_id,
                        "subfolderId": subfolder_id,
                        "jobId": job_id,
                        "status": "subfolder_completed",
                        "aiScore": final_score,
                        "aiStatus": ai_status,
                        "note": None
                    })
                    await notify(conn,
                        subfolder_notification,
                    )
                except Exception as notify_err:
                    print(f"[CSMS-AI] Warning: Failed to send pg_notify for subfolder {subfolder_name}: {notify_err}")

        # --- Stage 6: Recalculate Parent & Root Scores ---
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE csms_ai_evaluation_job SET progress_message = 'Finishing evaluation...' WHERE id = $1",
                job_id,
            )
        # Nothing could be scored at all (LLM down, files missing...): that is a failed run, not a completed one.
        final_status = "failed" if total_subfolders and len(failed_subfolders) == total_subfolders else "completed"
        if trial:
            await _finish_trial(job_id, contract_folder_id, rubric_version_id, job_started, pool)
        elif final_status == "completed":
            # recompute parent/root scores only when at least one element got a new AI score
            await recalculate_contract_ai_scores(folder["contract_id"], pool)

        # --- Stage 7: Update Job & Notify ---
        async with pool.acquire() as conn:
            await conn.execute(
                """UPDATE csms_ai_evaluation_job
                   SET status = $6,
                       progress_message = $3,
                       error_message = $4,
                       model_used = $5,
                       completed_at = $1
                   WHERE id = $2 AND status = 'processing'""",
                datetime.now(timezone.utc),
                job_id,
                ("Evaluation complete" if not failed_subfolders
                 else "Evaluation failed: no element could be scored" if final_status == "failed"
                 else f"Evaluation complete, {len(failed_subfolders)} element(s) need re-run"),
                ("AI unavailable for: " + "; ".join(failed_subfolders)[:900]) if failed_subfolders else None,
                ", ".join(sorted(models_used))[:100] or None,
                final_status,
            )

            # Get updated root folder details
            root_folder = await conn.fetchrow(
                "SELECT ai_score, ai_status FROM csms_contract_folder WHERE id = $1",
                contract_folder_id,
            )
            final_root_score = float(root_folder["ai_score"]) if root_folder["ai_score"] is not None else 0.0
            final_root_status = root_folder["ai_status"]

            notification = json.dumps({
                "folderId": contract_folder_id,
                "jobId": job_id,
                "status": final_status,
                "errorMessage": ("AI unavailable for: " + "; ".join(failed_subfolders))[:500] if failed_subfolders else None,
                "aiScore": final_root_score,
                "aiStatus": final_root_status,
            })
            await notify(conn,
                notification,
            )
        print(f"[CSMS-AI] Evaluation completed for all subfolders. Final root AI score: {final_root_score}")

    except JobCancelled:
        print(f"[CSMS-AI] Job {job_id} was cancelled, stopping")
        async with pool.acquire() as conn:
            await conn.execute(
                """UPDATE csms_contract_folder SET ai_reasoning = NULL
                   WHERE ai_reasoning LIKE 'PROCESSING:%'
                     AND path <@ (SELECT path FROM csms_contract_folder WHERE id = $1)::ltree""",
                uuid.UUID(contract_folder_id),
            )
    except Exception as e:
        tb = traceback.format_exc()
        print(f"[CSMS-AI] FAILED: {e}\n{tb}")
        try:
            async with pool.acquire() as conn:
                await conn.execute(
                    """UPDATE csms_ai_evaluation_job
                       SET status = 'failed', error_message = $1, completed_at = $2
                       WHERE id = $3""",
                    str(e),
                    datetime.now(timezone.utc),
                    job_id,
                )
                await conn.execute(
                    """UPDATE csms_contract_folder SET ai_reasoning = NULL
                       WHERE ai_reasoning LIKE 'PROCESSING:%'
                         AND path <@ (SELECT path FROM csms_contract_folder WHERE id = $1)::ltree""",
                    uuid.UUID(contract_folder_id),
                )
                await notify(conn,
                    json.dumps({
                        "folderId": str(contract_folder_id),
                        "jobId": str(job_id),
                        "status": "failed",
                        "errorMessage": str(e)[:500],
                    }),
                )
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    reload_mode = os.getenv("CSMS_ENV", "").lower() not in ("prod", "production")
    uvicorn.run("server.main:app", host=CSMS_AI_HOST, port=CSMS_AI_PORT, reload=reload_mode)
