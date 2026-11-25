import asyncio
import asyncpg

async def test():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    
    rows = await conn.fetch("SELECT path FROM csms_contract_folder WHERE path::text LIKE '%_%' LIMIT 5")
    for r in rows:
        print("path:", r['path'])
        
    await conn.close()

if __name__ == '__main__':
    asyncio.run(test())
