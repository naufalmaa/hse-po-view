import asyncio
import asyncpg

async def test():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    res = await conn.fetch("SELECT column_name FROM information_schema.columns WHERE table_name = 'csms_evidence_chunk'")
    print([r[0] for r in res])
    await conn.close()

if __name__ == '__main__':
    asyncio.run(test())
