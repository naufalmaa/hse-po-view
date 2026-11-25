import asyncio
import asyncpg

async def test():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    
    count = await conn.fetchval("SELECT count(*) FROM csms_contract_folder WHERE path::text LIKE '%_%'")
    print("Paths with underscores:", count)
        
    await conn.close()

if __name__ == '__main__':
    asyncio.run(test())
