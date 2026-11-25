import asyncio
import os
import re
import time
from typing import Dict, Any, List
import uuid
from server.db import get_pool
from server.notify import notify

# Bump when extraction changes in a way that should invalidate cached chunks
# (2: per-page text, OCR via qwen3-vl/PaddleOCR, archives, type sniffing).
EXTRACTOR_VERSION = "2"

EXCLUDED_FILES = {"expected_result.json", "readme.md", ".keep", ".placeholder", "thumbs.db", ".ds_store"}


def is_scoreable(name: str) -> bool:
    return bool(re.match(r'^([12])\s', name) or re.match(r'^([1-8])\.([0-9]+)', name))


def parse_segment(name: str):
    if name == 'A. RENCANA K3LL':
        return (-2, [], '')
    
    # Try matching 1.2.3 etc.
    match_dot = re.match(r'^(\d+(?:\.\d+)*)', name)
    if match_dot:
        parts = [int(p) for p in match_dot.group(1).split('.')]
        return (1, parts, name.lower())
    
    # Try matching 1 or 2 followed by space
    match_space = re.match(r'^(\d+)\s', name)
    if match_space:
        return (1, [int(match_space.group(1))], name.lower())
        
    return (2, [], name.lower())


def get_file_sort_key(ancestor_names: List[str], fname: str):
    key = []
    for name in ancestor_names:
        key.append(parse_segment(name))
    key.append(parse_segment(fname))
    return key


async def extract_and_store(
    contract_folder_id: str,
    folder_path: str,
    job_id: str = None,
    target_subfolder_id: str = None,
    subfolder_idx: int = None,
    total_subfolders: int = None,
    profile: str = "thorough",
) -> Dict[str, Any]:
    """
    1. Fetch contract_folder data recursively to establish ordering.
    2. Walk folder_path, match files on disk with DB records.
    3. Filter by target_subfolder_id if provided.
    4. Sort the files chronologically/hierarchically based on K3LL element ordering (1, 1.1, etc.).
    5. Extract text from each file sequentially.
    6. Chunk text (≤4000 char per chunk) and INSERT into csms_evidence_chunk.
    7. Return summary { total_chunks, files_processed }.
    """
    import sys
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
    from engine.extractors.router import ExtractorRouter

    router = ExtractorRouter()
    router.profile = profile  # "fast": important pages only (see router)
    pool = await get_pool()

    all_chunks: List[Dict[str, Any]] = []
    files_processed = 0

    # Fetch all folders/files in this contract hierarchy for ordering and lookup
    async with pool.acquire() as conn:
        db_rows = await conn.fetch(
            """SELECT id, name, file_path, path, file_type FROM csms_contract_folder 
               WHERE path <@ (SELECT path FROM csms_contract_folder WHERE id = $1)::ltree""",
            uuid.UUID(contract_folder_id),
        )
        # Extraction cache: a file id never changes content (a re-upload gets a new id), so chunks written by
        # the current extractor version are reused instead of re-reading/OCR'ing the file on every run.
        existing_embedded_rows = await conn.fetch(
            """SELECT DISTINCT file_path FROM csms_evidence_chunk
               WHERE contract_folder_id = $1 AND metadata->>'xv' = ANY($2::text[])""",
            uuid.UUID(contract_folder_id),
            # a fast run may reuse full (thorough) extractions; a thorough run needs full ones
            [EXTRACTOR_VERSION, EXTRACTOR_VERSION + "f"] if profile == "fast" else [EXTRACTOR_VERSION],
        )
    db_records = {str(row["id"]): row for row in db_rows}
    embedded_paths = {row["file_path"] for row in existing_embedded_rows}

    # Collect all files on disk
    collected_files = []
    for root, _dirs, files in os.walk(folder_path):
        for fname in files:
            if fname.lower() in EXCLUDED_FILES:
                continue
            fpath = os.path.join(root, fname)
            if os.path.getsize(fpath) == 0:
                continue

            file_id = None
            parent_id = None
            parent_name = None
            ancestor_names = []

            potential_file_id = os.path.basename(root)
            is_uuid = False
            try:
                uuid.UUID(potential_file_id)
                is_uuid = True
            except ValueError:
                pass

            file_row = None
            if is_uuid and potential_file_id in db_records:
                file_row = db_records[potential_file_id]
            else:
                # Fallback: search by name or file_path basename
                for row in db_rows:
                    if row["file_type"] == 'file':
                        row_file_path = row.get("file_path")
                        if row["name"] == fname or (row_file_path and os.path.basename(row_file_path) == fname):
                            file_row = row
                            break

            if file_row:
                # Filter by target_subfolder_id if specified
                if target_subfolder_id:
                    path_parts = file_row["path"].split('.')
                    if target_subfolder_id not in path_parts:
                        continue

                # Check if this file is already fully embedded in the database
                rel_path = os.path.relpath(fpath, folder_path)
                if rel_path in embedded_paths:
                    print(f"[EXTRACTION] Skipping already embedded file: {fname}")
                    files_processed += 1
                    continue

                file_id = str(file_row["id"])
                file_path = str(file_row["path"])

                # Resolve ancestors
                path_ids = file_path.split('.')
                ancestors = []
                for pid in path_ids:
                    if pid in db_records:
                        ancestors.append(db_records[pid])

                # Select the ancestor that matches the scoreable structure
                for anc in ancestors:
                    if is_scoreable(anc["name"]):
                        parent_id = str(anc["id"])
                        parent_name = str(anc["name"])
                        break

                ancestor_names = [anc["name"] for anc in ancestors]
            else:
                # If target_subfolder_id is set and we can't map this file, ignore it to be safe
                if target_subfolder_id:
                    continue

            sort_key = get_file_sort_key(ancestor_names, fname)
            collected_files.append({
                "fpath": fpath,
                "fname": fname,
                "file_id": file_id,
                "parent_id": parent_id,
                "parent_name": parent_name,
                "sort_key": sort_key,
            })

    # Sort files sequentially by K3LL elements and folders
    collected_files.sort(key=lambda x: x["sort_key"])

    # Sequentially extract in the sorted order
    total_files = len(collected_files)
    for idx, item in enumerate(collected_files, 1):
        fpath = item["fpath"]
        fname = item["fname"]
        file_id = item["file_id"]
        parent_id = item["parent_id"]
        parent_name = item["parent_name"]

        try:
            if file_id:
                async with pool.acquire() as conn:
                    await conn.execute(
                        """UPDATE csms_contract_folder 
                           SET ai_reasoning = 'PROCESSING: Ekstraksi...', updated_at = NOW() 
                           WHERE id = $1""",
                        uuid.UUID(file_id),
                    )
                    if parent_id:
                        await conn.execute(
                            """UPDATE csms_contract_folder 
                               SET ai_reasoning = 'PROCESSING: Mengekstraksi dokumen...', updated_at = NOW() 
                               WHERE id = $1""",
                            uuid.UUID(parent_id),
                        )

            if job_id:
                if subfolder_idx and total_subfolders:
                    display_msg = f"Extracting subfolder {subfolder_idx}/{total_subfolders}: {parent_name} -> {fname} ({idx}/{total_files})" if parent_name else f"Extracting subfolder {subfolder_idx}/{total_subfolders}: {fname} ({idx}/{total_files})"
                else:
                    display_msg = f"Extracting: {parent_name} -> {fname} ({idx}/{total_files})" if parent_name else f"Extracting: {fname} ({idx}/{total_files})"
                async with pool.acquire() as conn:
                    await conn.execute(
                        "UPDATE csms_ai_evaluation_job SET progress_message = $1 WHERE id = $2",
                        display_msg,
                        uuid.UUID(job_id),
                    )
                    await notify(conn,
                        __import__("json").dumps({
                            "folderId": str(contract_folder_id),
                            "jobId": str(job_id),
                            "status": "processing",
                            "progressMessage": display_msg
                        })
                    )

            result = await asyncio.to_thread(router.extract_document, fpath)
            evidence_list = result.get("evidence", [])

            if file_id:
                async with pool.acquire() as conn:
                    await conn.execute(
                        """UPDATE csms_contract_folder 
                           SET ai_reasoning = 'COMPLETED', updated_at = NOW() 
                           WHERE id = $1""",
                        file_id,
                    )

            rel_path = os.path.relpath(fpath, folder_path)
            if not evidence_list:
                # Tell the jurors a submitted file could not be read (instead of silently ignoring it).
                # No cache version on purpose: it is retried on the next run (e.g. after installing unrar).
                reason = "; ".join(result.get("errors") or []) or result.get("reason") or "tidak ada teks yang dapat dibaca"
                all_chunks.append({
                    "file_path": rel_path,
                    "chunk_index": 0,
                    "content": f"[BERKAS TIDAK TERBACA: {fname}] {reason}",
                    "metadata": {"extractor_used": result.get("extractor_used", "unknown"), "unreadable": True},
                })
                continue

            files_processed += 1

            # split long pages into 4000-char chunks instead of cutting them off
            pieces = [str(t)[i:i + 4000] for t in evidence_list for i in range(0, max(len(str(t)), 1), 4000)]
            for chunk_idx, chunk_str in enumerate(pieces):
                all_chunks.append({
                    "file_path": rel_path,
                    "chunk_index": chunk_idx,
                    "content": chunk_str,
                    "metadata": {
                        "extractor_used": result.get("extractor_used", "unknown"),
                        "characters": len(chunk_str),
                        "ocr_used": bool(result.get("ocr_used")),
                        "xv": EXTRACTOR_VERSION + ("f" if profile == "fast" else ""),
                    },
                })
        except Exception as e:
            print(f"[EXTRACTION] Error extracting {fname}: {e}")

    # Bulk insert
    file_rel_paths = [os.path.relpath(item["fpath"], folder_path) for item in collected_files]
    async with pool.acquire() as conn:
        if target_subfolder_id:
            if file_rel_paths:
                await conn.execute(
                    "DELETE FROM csms_evidence_chunk WHERE contract_folder_id = $1 AND file_path = ANY($2)",
                    uuid.UUID(contract_folder_id),
                    file_rel_paths,
                )
        else:
            await conn.execute("DELETE FROM csms_evidence_chunk WHERE contract_folder_id = $1", uuid.UUID(contract_folder_id))
            
        if all_chunks:
            await conn.executemany(
                """INSERT INTO csms_evidence_chunk
                   (contract_folder_id, file_path, chunk_index, content, metadata)
                   VALUES ($1, $2, $3, $4, $5::jsonb)""",
                [
                    (uuid.UUID(contract_folder_id), c["file_path"], c["chunk_index"], c["content"],
                     __import__("json").dumps(c["metadata"]))
                    for c in all_chunks
                ],
            )

    return {"total_chunks": len(all_chunks), "files_processed": files_processed}
