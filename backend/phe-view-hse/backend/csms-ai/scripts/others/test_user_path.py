import asyncio
import asyncpg

async def test():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    
    contract_folder_id = '3d447636-9d58-4576-ac15-1827ff51b547'
    
    rows = await conn.fetch(
        "SELECT id, path FROM csms_contract_folder WHERE id = $1",
        contract_folder_id
    )
    print("ROOT path:", rows[0]['path'])
    
    await conn.close()

if __name__ == '__main__':
    asyncio.run(test())
