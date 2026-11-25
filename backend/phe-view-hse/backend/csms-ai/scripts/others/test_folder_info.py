import asyncio
import asyncpg

async def test():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    
    row = await conn.fetchrow("SELECT file_type, contract_id, path FROM csms_contract_folder WHERE id = '3d447636-9d58-4576-ac15-1827ff51b547'")
    print(dict(row))
        
    await conn.close()

if __name__ == '__main__':
    asyncio.run(test())
