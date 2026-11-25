import asyncio
import asyncpg
import os

async def main():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    chunks = await conn.fetch("SELECT COUNT(*) FROM csms_evidence_chunk")
    print(f"Total chunks in DB: {chunks[0]['count']}")
    if chunks[0]['count'] > 0:
        sample = await conn.fetch("SELECT id, contract_folder_id, file_path FROM csms_evidence_chunk LIMIT 5")
        for s in sample:
            print(dict(s))
    await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
