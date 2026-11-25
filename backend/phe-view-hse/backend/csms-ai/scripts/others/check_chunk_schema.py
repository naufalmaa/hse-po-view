import asyncio
from server.db import get_pool

async def run():
    pool = await get_pool()
    async with pool.acquire() as conn:
        res = await conn.fetch("SELECT column_name FROM information_schema.columns WHERE table_name = 'csms_evidence_chunk'")
        print([r[0] for r in res])

if __name__ == '__main__':
    asyncio.run(run())
