import asyncio
import asyncpg

async def test():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    
    count = await conn.fetchval("SELECT count(*) FROM csms_contract_folder WHERE contract_id = '3d447636-9d58-4576-ac15-1827ff51b547' AND file_type = 'file'")
    print("file count:", count)
        
    await conn.close()

if __name__ == '__main__':
    asyncio.run(test())
