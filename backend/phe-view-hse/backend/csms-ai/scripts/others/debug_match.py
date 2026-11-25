import asyncio
import asyncpg
import os
import re

async def main():
    pool = await asyncpg.create_pool('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    
    contract_folder_id = '3d447636-9d58-4576-ac15-1827ff51b547'
    
    from server.pipeline.rag import retrieve_evidence_chunks
    all_evidence_chunks = await retrieve_evidence_chunks(contract_folder_id, limit=50000)
    print(f"RAG returned {len(all_evidence_chunks)} chunks.")
    
    async with pool.acquire() as conn:
        folder = await conn.fetchrow("SELECT contract_id FROM csms_contract_folder WHERE id = $1", contract_folder_id)
        
        subfolder = await conn.fetchrow(
            "SELECT id, path FROM csms_contract_folder WHERE contract_id = $1 AND name LIKE '1 Kepemimpinan%'",
            folder['contract_id']
        )
        
        files_rows = await conn.fetch(
            """SELECT id, file_path FROM csms_contract_folder 
               WHERE contract_id = $1 AND file_type = 'file' 
                 AND path <@ $2::ltree""",
            folder['contract_id'],
            subfolder['path']
        )
        
        subfolder_file_paths = {r["file_path"] for r in files_rows if r["file_path"]}
        print(f"Files: {subfolder_file_paths}")
        
        def strip_timestamp(name):
            return re.sub(r'^\d{14}-', '', name)
        
        clean_subfolder_file_paths = {strip_timestamp(p) for p in subfolder_file_paths}
        print(f"Cleaned files: {clean_subfolder_file_paths}")
        
        evidence_chunks = []
        for chunk in all_evidence_chunks:
            chunk_basename = os.path.basename(chunk["file_path"].replace('\\', '/'))
            clean_chunk_basename = strip_timestamp(chunk_basename)
            if clean_chunk_basename in clean_subfolder_file_paths:
                evidence_chunks.append(chunk)
                
        print(f"Matched {len(evidence_chunks)} chunks.")

if __name__ == '__main__':
    asyncio.run(main())
