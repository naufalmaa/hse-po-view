import asyncio
import asyncpg
import os
import re

async def main():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    
    contract_folder_id = '3d447636-9d58-4576-ac15-1827ff51b547'
    
    # 1. Fetch chunks for contract
    rows = await conn.fetch(
        """SELECT id, file_path, chunk_index, content, metadata
           FROM csms_evidence_chunk
           WHERE contract_folder_id = $1
           LIMIT 20""",
        contract_folder_id
    )
    all_evidence_chunks = [{"file_path": r["file_path"]} for r in rows]
    print(f"Sample chunks retrieved: {len(all_evidence_chunks)}")
    
    if len(all_evidence_chunks) > 0:
        print("Sample chunk file_path:", all_evidence_chunks[0]['file_path'])
    
    # 2. Emulate fetching subfolder files for "1 Kepemimpinan dan Komitmen"
    folder = await conn.fetchrow("SELECT contract_id FROM csms_contract_folder WHERE id = $1", contract_folder_id)
    contract_id = folder['contract_id']
    
    # ID for "1 Kepemimpinan dan Komitmen" subfolder in this contract
    subfolder = await conn.fetchrow(
        """SELECT id, path FROM csms_contract_folder 
           WHERE contract_id = $1 AND name LIKE '1 Kepemimpinan%' 
           LIMIT 1""", contract_id)
    
    subfolder_path = subfolder['path']
    print("\nSubfolder path:", subfolder_path)
    
    files_rows = await conn.fetch(
        """SELECT id, file_path FROM csms_contract_folder 
           WHERE contract_id = $1 AND file_type = 'file' 
             AND path <@ $2::ltree""",
        contract_id,
        subfolder_path,
    )
    subfolder_file_paths = {r["file_path"] for r in files_rows if r["file_path"]}
    print(f"Files found for subfolder: {len(subfolder_file_paths)}")
    if subfolder_file_paths:
        print("Sample subfolder file_path from DB:", list(subfolder_file_paths)[0])
        
    def strip_timestamp(name):
        return re.sub(r'^\d{14}-', '', name)

    clean_subfolder_file_paths = {strip_timestamp(p) for p in subfolder_file_paths}
    print("Clean DB paths sample:", list(clean_subfolder_file_paths)[0] if clean_subfolder_file_paths else "None")
    
    evidence_chunks = []
    for chunk in all_evidence_chunks:
        chunk_basename = os.path.basename(chunk["file_path"].replace('\\', '/'))
        clean_chunk_basename = strip_timestamp(chunk_basename)
        print(f"Chunk basename: {chunk_basename}, Cleaned: {clean_chunk_basename}")
        if clean_chunk_basename in clean_subfolder_file_paths:
            evidence_chunks.append(chunk)
            
    print(f"\nMatched chunks: {len(evidence_chunks)}")

    await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
