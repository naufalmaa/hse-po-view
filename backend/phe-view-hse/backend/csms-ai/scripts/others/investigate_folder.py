import asyncio
import asyncpg
import json
import uuid

async def main():
    folder_id = '3d447636-9d58-4576-ac15-1827ff51b547'
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    
    # 1. Check folder details
    folder = await conn.fetchrow("SELECT * FROM csms_contract_folder WHERE id = $1", uuid.UUID(folder_id))
    print("--- FOLDER ---")
    print(dict(folder) if folder else "Not found")
    if not folder:
        return
        
    contract_id = folder['contract_id']
    folder_path = folder['path']
    
    # 2. Check files under this folder
    files = await conn.fetch("""
        SELECT id, name, file_path, file_type, path 
        FROM csms_contract_folder 
        WHERE contract_id = $1 AND file_type = 'file' AND path <@ $2::ltree
    """, contract_id, folder_path)
    
    print(f"\n--- FILES ({len(files)}) ---")
    for f in files:
        print(dict(f))
        
    # 3. Check evidence chunks for this folder (if it's a leaf, chunks might be stored under contract root)
    # Evidence chunks usually reference contract_folder_id. Let's see all chunks for this contract.
    # We'll just look for chunks that match the file_paths.
    file_paths = [f['file_path'] for f in files if f['file_path']]
    
    print("\n--- CHUNKS ---")
    if file_paths:
        chunks = await conn.fetch("""
            SELECT id, contract_folder_id, file_path, chunk_index, length(content) as content_len 
            FROM csms_evidence_chunk 
            WHERE file_path = ANY($1)
        """, file_paths)
        print(f"Found {len(chunks)} chunks with exact file_path match.")
        for c in chunks:
            print(dict(c))
            
        # Try a fuzzy match in case file_path differs
        basenames = [f.split('/')[-1] for f in file_paths if f]
        # Just select 5 recent chunks from the whole contract
        # We need the root folder ID
        root_folder = await conn.fetchrow("SELECT id FROM csms_contract_folder WHERE contract_id = $1 AND parent_id IS NULL", contract_id)
        if root_folder:
            all_chunks = await conn.fetch("SELECT file_path FROM csms_evidence_chunk WHERE contract_folder_id = $1 LIMIT 5", root_folder['id'])
            print(f"\nSample chunks for contract (root {root_folder['id']}):")
            for c in all_chunks:
                print(dict(c))
                
    await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
