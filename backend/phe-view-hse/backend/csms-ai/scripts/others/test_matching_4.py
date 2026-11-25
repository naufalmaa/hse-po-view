import asyncio
import asyncpg
import os
import re

def strip_timestamp(name: str) -> str:
    return re.sub(r'^\d{14}-', '', name)

async def test():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    
    # 1. Get the ROOT folder ID
    contract_folder_id = '3d447636-9d58-4576-ac15-1827ff51b547'
    
    # 2. Get a subfolder
    subfolder = await conn.fetchrow("""
        SELECT f.id, f.name, f.path 
        FROM csms_contract_folder f 
        WHERE f.path <@ (SELECT path FROM csms_contract_folder WHERE id = $1)::ltree
          AND f.file_type = 'folder'
        ORDER BY f.created_at ASC
        LIMIT 1 OFFSET 2
    """, contract_folder_id)
    
    print("Subfolder name:", subfolder['name'])
    print("Subfolder path:", subfolder['path'])
    
    # 3. Get DB files for this subfolder
    files_rows = await conn.fetch("""
        SELECT id, file_path 
        FROM csms_contract_folder 
        WHERE file_type = 'file' AND path <@ $1::ltree
    """, subfolder['path'])
    
    db_file_paths = {r['file_path'] for r in files_rows if r['file_path']}
    print("DB file_paths (raw):", db_file_paths)
    clean_db_file_paths = {strip_timestamp(p) for p in db_file_paths}
    print("DB file_paths (clean):", clean_db_file_paths)
    
    # 4. Get chunks for this contract
    all_chunks = await conn.fetch("""
        SELECT file_path FROM csms_evidence_chunk WHERE contract_folder_id = $1
    """, contract_folder_id)
    
    matched_chunks = 0
    for chunk in all_chunks:
        chunk_basename = os.path.basename(chunk["file_path"].replace('\\', '/'))
        clean_chunk_basename = strip_timestamp(chunk_basename)
        if clean_chunk_basename in clean_db_file_paths:
            matched_chunks += 1
            
    print(f"Matched {matched_chunks} chunks out of {len(all_chunks)} total chunks.")
        
    await conn.close()

if __name__ == '__main__':
    asyncio.run(test())
