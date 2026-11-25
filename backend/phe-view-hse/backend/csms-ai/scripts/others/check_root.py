import asyncio
import asyncpg
import uuid

async def test():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    res = await conn.fetchrow("SELECT id, contract_id, name, parent_id, path FROM csms_contract_folder WHERE id = $1", uuid.UUID('3d447636-9d58-4576-ac15-1827ff51b547'))
    print(f"Contract Folder: {dict(res)}")
    
    files = await conn.fetch("SELECT id, name, parent_id, path FROM csms_contract_folder WHERE contract_id = $1 AND file_type = 'file' LIMIT 3", res['contract_id'])
    print(f"Files: {[dict(f) for f in files]}")
    await conn.close()

if __name__ == '__main__':
    asyncio.run(test())
