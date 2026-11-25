import asyncio
import asyncpg
import os

async def main():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    chunks = await conn.fetch("SELECT COUNT(*) FROM csms_evidence_chunk WHERE contract_folder_id = '3d447636-9d58-4576-ac15-1827ff51b547'")
    print(f"Chunks for folder: {chunks[0]['count']}")
    await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
