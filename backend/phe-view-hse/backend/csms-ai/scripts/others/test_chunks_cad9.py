import asyncio
import asyncpg
import os
import re
import json

def strip_timestamp(name: str) -> str:
    return re.sub(r'^\d{14}-', '', name)

async def test():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    contract_folder_id = 'cad9aeca-75a2-43a2-9232-015461495a90'
    
    subfolders = await conn.fetch("""
        SELECT f.id, f.name, f.path 
        FROM csms_contract_folder f 
        WHERE f.path <@ (SELECT path FROM csms_contract_folder WHERE id = $1)::ltree
          AND f.file_type = 'folder'
    """, contract_folder_id)
    
    all_chunks = await conn.fetch("""
        SELECT file_path FROM csms_evidence_chunk WHERE contract_folder_id = $1 LIMIT 50000
    """, contract_folder_id)
    
    print(f"Total chunks for contract: {len(all_chunks)}")
    if len(all_chunks) == 0:
        print("NO CHUNKS EXIST FOR THIS CONTRACT!")
    
    for subfolder in subfolders:
        files_rows = await conn.fetch("""
            SELECT id, file_path 
            FROM csms_contract_folder 
            WHERE file_type = 'file' AND path <@ $1::ltree
        """, subfolder['path'])
        
        db_file_paths = {r['file_path'] for r in files_rows if r['file_path']}
        clean_db_file_paths = {strip_timestamp(p) for p in db_file_paths}
        
        matched_chunks = 0
        for chunk in all_chunks:
            chunk_basename = os.path.basename(chunk["file_path"].replace('\\', '/'))
            clean_chunk_basename = strip_timestamp(chunk_basename)
            if clean_chunk_basename in clean_db_file_paths:
                matched_chunks += 1
                
        if len(clean_db_file_paths) > 0:
            print(f"Subfolder '{subfolder['name']}' has {len(clean_db_file_paths)} files, matched {matched_chunks} chunks.")
            if matched_chunks == 0:
                print(f"  -> WARNING: Zero matches. Files: {clean_db_file_paths}")
            
    await conn.close()

if __name__ == '__main__':
    asyncio.run(test())
