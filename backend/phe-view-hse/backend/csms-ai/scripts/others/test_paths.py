import asyncio
import asyncpg
import re

async def test():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    
    contract_id = '691b802b-8b30-4f94-8bd2-a60af7237773'
    
    files_rows = await conn.fetch(
        """SELECT id, name, file_path, path FROM csms_contract_folder 
           WHERE contract_id = $1 AND file_type = 'file'""",
        contract_id
    )
    print("Files found:", len(files_rows))
    for r in files_rows[:5]:
        print("path:", r['path'])
        
    await conn.close()

if __name__ == '__main__':
    asyncio.run(test())
