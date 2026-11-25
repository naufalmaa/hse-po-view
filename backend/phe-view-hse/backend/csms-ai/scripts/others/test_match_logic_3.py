import asyncio
import asyncpg
import os
import re

def strip_timestamp(name: str) -> str:
    return re.sub(r'^\d{14}-', '', name)

async def test():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    
    # Get a file path from the database
    row = await conn.fetchrow("SELECT file_path FROM csms_contract_folder WHERE contract_id = '691b802b-8b30-4f94-8bd2-a60af7237773' AND file_type = 'file' AND file_path IS NOT NULL LIMIT 1")
    db_file_path = row['file_path']
    print("DB file_path:", db_file_path)
    
    # Get a chunk from evidence chunks
    chunk_row = await conn.fetchrow("SELECT file_path FROM csms_evidence_chunk LIMIT 1")
    chunk_file_path = chunk_row['file_path']
    print("Chunk file_path:", chunk_file_path)
    
    # Simulate the logic
    subfolder_file_paths = {db_file_path}
    clean_subfolder_file_paths = {strip_timestamp(p) for p in subfolder_file_paths}
    print("clean_subfolder_file_paths:", clean_subfolder_file_paths)
    
    chunk_basename = os.path.basename(chunk_file_path.replace('\\', '/'))
    clean_chunk_basename = strip_timestamp(chunk_basename)
    print("clean_chunk_basename:", clean_chunk_basename)
    
    print("Match?", clean_chunk_basename in clean_subfolder_file_paths)
        
    await conn.close()

if __name__ == '__main__':
    asyncio.run(test())
