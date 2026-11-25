import asyncio
import asyncpg

async def test():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    
    folder_id = '3d447636-9d58-4576-ac15-1827ff51b547'
    
    row = await conn.fetchrow(
        "SELECT id, contract_id, name, path FROM csms_contract_folder WHERE id = $1",
        folder_id
    )
    print("Folder:", dict(row) if row else None)
    
    contract_id = row['contract_id']
    print("Contract ID:", contract_id)
    
    files_rows = await conn.fetch(
        """SELECT id, name, file_path, file_type FROM csms_contract_folder 
           WHERE contract_id = $1""",
        contract_id
    )
    print("Total items for this contract_id:", len(files_rows))
    
    types = {}
    for r in files_rows:
        t = r['file_type']
        types[t] = types.get(t, 0) + 1
    print("File types:", types)
    
    await conn.close()

if __name__ == '__main__':
    asyncio.run(test())
