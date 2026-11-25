import asyncio
import asyncpg
import os
import re
import uuid

async def main():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    
    contract_folder_id = '3d447636-9d58-4576-ac15-1827ff51b547'
    
    rows = await conn.fetch(
        """SELECT id, file_path, chunk_index, content, metadata
           FROM csms_evidence_chunk
           WHERE contract_folder_id = $1
           """,
        uuid.UUID(contract_folder_id)
    )
    all_evidence_chunks = [{"file_path": r["file_path"]} for r in rows]
    
    folder = await conn.fetchrow("SELECT contract_id FROM csms_contract_folder WHERE id = $1", uuid.UUID(contract_folder_id))
    contract_id = folder['contract_id']
    
    subfolders = await conn.fetch(
        """SELECT id, name, path FROM csms_contract_folder f
           WHERE f.contract_id = $1 AND f.file_type = 'folder' 
             AND f.path <@ (SELECT path FROM csms_contract_folder WHERE id = $2)::ltree
           ORDER BY f.path""",
        contract_id,
        uuid.UUID(contract_folder_id),
    )
    
    for subfolder in subfolders:
        subfolder_path = subfolder['path']
        
        files_rows = await conn.fetch(
            """SELECT id, file_path FROM csms_contract_folder 
               WHERE contract_id = $1 AND file_type = 'file' 
                 AND path <@ $2::ltree""",
            contract_id,
            subfolder_path,
        )
        subfolder_file_paths = {r["file_path"] for r in files_rows if r["file_path"]}
        if len(subfolder_file_paths) == 0:
            continue
            
        def strip_timestamp(name):
            return re.sub(r'^\d{14}-', '', name)

        clean_subfolder_file_paths = {strip_timestamp(p) for p in subfolder_file_paths}
        
        evidence_chunks = []
        for chunk in all_evidence_chunks:
            chunk_basename = os.path.basename(chunk["file_path"].replace('\\', '/'))
            clean_chunk_basename = strip_timestamp(chunk_basename)
            if clean_chunk_basename in clean_subfolder_file_paths:
                evidence_chunks.append(chunk)
                
        print(f"Subfolder: {subfolder['name']}")
        print(f"  Files in DB: {len(subfolder_file_paths)}")
        print(f"  Matched Chunks: {len(evidence_chunks)}")
        if len(evidence_chunks) == 0 and len(subfolder_file_paths) > 0:
            print("  -> ERROR: Files exist in DB but 0 chunks matched!")

    await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
