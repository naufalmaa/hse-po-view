import asyncio
import asyncpg
import os
import re

def strip_timestamp(name: str) -> str:
    return re.sub(r'^\d{14}-', '', name)

async def test():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    contract_folder_id = '3d447636-9d58-4576-ac15-1827ff51b547'
    
    subfolders = await conn.fetch("""
        SELECT f.id, f.name, f.path 
        FROM csms_contract_folder f 
        WHERE f.path <@ (SELECT path FROM csms_contract_folder WHERE id = $1)::ltree
          AND f.file_type = 'folder'
    """, contract_folder_id)
    
    all_chunks = await conn.fetch("""
        SELECT file_path FROM csms_evidence_chunk WHERE contract_folder_id = $1
    """, contract_folder_id)
    
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
                
        if len(clean_db_file_paths) > 0 and matched_chunks == 0:
            print(f"Subfolder: {subfolder['name']}")
            print(f"Has {len(clean_db_file_paths)} files but 0 matched chunks!")
            print(f"Files: {clean_db_file_paths}")
            
    await conn.close()

if __name__ == '__main__':
    asyncio.run(test())
