import asyncio
import asyncpg
import json
import uuid

async def main():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    rows = await conn.fetch("SELECT column_name FROM information_schema.columns WHERE table_name = 'csms_evidence_chunk'")
    for r in rows:
        print(dict(r))
    await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
