import asyncio
import asyncpg

async def test():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    subfolder = await conn.fetchrow("SELECT id, path FROM csms_contract_folder WHERE contract_id = '691b802b-8b30-4f94-8bd2-a60af7237773' AND name LIKE '1 Kepemimpinan%'")
    print("Path:", subfolder['path'])
    
    files = await conn.fetch("SELECT count(*) FROM csms_contract_folder WHERE contract_id = '691b802b-8b30-4f94-8bd2-a60af7237773' AND file_type = 'file' AND path <@ $1::ltree", subfolder['path'])
    print("Count:", files[0]['count'])
    await conn.close()

if __name__ == '__main__':
    asyncio.run(test())
