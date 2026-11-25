import asyncio
import asyncpg
import os
import re

async def test():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    
    contract_folder_id = '3d447636-9d58-4576-ac15-1827ff51b547'
    folder = await conn.fetchrow("SELECT contract_id FROM csms_contract_folder WHERE id = $1", contract_folder_id)
    contract_id = folder['contract_id']
    
    # get chunks
    all_evidence_chunks = await conn.fetch(
        "SELECT id, text_content, metadata, file_path FROM csms_evidence_chunk WHERE contract_folder_id = $1",
        contract_folder_id
    )
    print("Total chunks:", len(all_evidence_chunks))
    
    # get subfolders
    subfolders = await conn.fetch("SELECT id, name, path FROM csms_contract_folder WHERE path <@ $1::ltree AND file_type = 'folder' AND name LIKE '1 Kepemimpinan%'", contract_folder_id)
    
    def strip_timestamp(name):
        return re.sub(r'^\d{14}-', '', name)
        
    for sub in subfolders:
        print("Sub:", sub['name'])
        files_rows = await conn.fetch(
            "SELECT id, file_path FROM csms_contract_folder WHERE contract_id = $1 AND file_type = 'file' AND path <@ $2::ltree",
            contract_id, sub['path']
        )
        
        subfolder_file_paths = {r["file_path"] for r in files_rows if r["file_path"]}
        clean_subfolder_file_paths = {strip_timestamp(os.path.basename(p.replace('\\', '/'))) for p in subfolder_file_paths}
        
        print("Clean subfolder files:", clean_subfolder_file_paths)
        
        matched_chunks = 0
        for chunk in all_evidence_chunks:
            chunk_basename = os.path.basename(chunk["file_path"].replace('\\', '/'))
            clean_chunk_basename = strip_timestamp(chunk_basename)
            if clean_chunk_basename in clean_subfolder_file_paths:
                matched_chunks += 1
                
        print("Matched chunks:", matched_chunks)
        
    await conn.close()

if __name__ == '__main__':
    asyncio.run(test())
