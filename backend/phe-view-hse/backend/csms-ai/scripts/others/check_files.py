import asyncio
import asyncpg

async def test():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    res = await conn.fetch("SELECT id, name, parent_id, contract_id, file_type, path FROM csms_contract_folder WHERE file_type = 'file' LIMIT 5")
    for r in res:
        print(dict(r))
    await conn.close()

if __name__ == '__main__':
    asyncio.run(test())
