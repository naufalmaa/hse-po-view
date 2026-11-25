import asyncio
import asyncpg

async def t():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    rows = await conn.fetch("SELECT file_path FROM csms_contract_folder WHERE contract_id = '691b802b-8b30-4f94-8bd2-a60af7237773' AND file_type = 'file' LIMIT 5")
    for r in rows:
        print(r['file_path'])
    await conn.close()

if __name__ == '__main__':
    asyncio.run(t())
