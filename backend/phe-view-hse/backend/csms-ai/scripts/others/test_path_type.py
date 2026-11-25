import asyncio
import asyncpg

async def test():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    
    cols = await conn.fetch("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'csms_contract_folder' AND column_name = 'path'")
    print("path column type:", dict(cols[0]))
    
    await conn.close()

if __name__ == '__main__':
    asyncio.run(test())
