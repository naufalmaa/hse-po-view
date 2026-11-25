import asyncio
import asyncpg
import re

async def test():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    
    subfolder_path = "3d447636-9d58-4576-ac15-1827ff51b547.77afca92-29d0-40af-b1fe-937679baa92d.18c0b6a0-1c93-4755-8d8b-90a5d09fbeca"
    subfolder_path_ltree = subfolder_path.replace('-', '_')
    contract_id = '691b802b-8b30-4f94-8bd2-a60af7237773'
    
    files_rows = await conn.fetch(
        """SELECT id, name, file_path FROM csms_contract_folder 
           WHERE contract_id = $1 AND file_type = 'file' 
             AND path <@ $2::ltree""",
        contract_id,
        subfolder_path_ltree,
    )
    print("Files found:", len(files_rows))
    for r in files_rows:
        print(r['file_path'])
    
    await conn.close()

if __name__ == '__main__':
    asyncio.run(test())
