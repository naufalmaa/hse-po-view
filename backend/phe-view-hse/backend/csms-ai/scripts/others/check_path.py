import asyncio
import asyncpg
import uuid

async def test():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    res = await conn.fetch("SELECT count(*), count(path) FROM csms_contract_folder WHERE contract_id = $1 AND file_type = 'file'", uuid.UUID('3d447636-9d58-4576-ac15-1827ff51b547'))
    for r in res:
        print(dict(r))
    await conn.close()

if __name__ == '__main__':
    asyncio.run(test())
