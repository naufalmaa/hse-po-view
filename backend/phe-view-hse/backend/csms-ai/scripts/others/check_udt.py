import asyncio
import asyncpg

async def test():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    res = await conn.fetch("SELECT data_type, udt_name FROM information_schema.columns WHERE table_name = 'csms_contract_folder' AND column_name = 'path'")
    for r in res:
        print(dict(r))
    await conn.close()

if __name__ == '__main__':
    asyncio.run(test())
