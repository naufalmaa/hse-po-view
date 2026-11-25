import asyncio
from server.db import get_pool

async def test():
    pool = await get_pool()
    subfolder_id = 'd82f7e76-3e14-485e-83d4-65485f65d1b1'
    async with pool.acquire() as conn:
        res = await conn.fetchrow("SELECT name, depth FROM csms_contract_folder WHERE id = $1", subfolder_id)
        print("Subfolder:", dict(res) if res else "NOT FOUND")

if __name__ == '__main__':
    asyncio.run(test())
