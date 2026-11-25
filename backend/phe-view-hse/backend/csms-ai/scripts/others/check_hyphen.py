import asyncio
import asyncpg
import uuid

async def test():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    
    res1 = await conn.fetch("SELECT count(*) FROM csms_contract_folder WHERE contract_id = '691b802b-8b30-4f94-8bd2-a60af7237773' AND file_type = 'file' AND path <@ '3d447636-9d58-4576-ac15-1827ff51b547'::ltree")
    print(f"Count WITH hyphens: {res1[0]['count']}")
    
    res2 = await conn.fetch("SELECT count(*) FROM csms_contract_folder WHERE contract_id = '691b802b-8b30-4f94-8bd2-a60af7237773' AND file_type = 'file' AND path <@ '3d447636_9d58_4576_ac15_1827ff51b547'::ltree")
    print(f"Count WITH underscores: {res2[0]['count']}")
    
    await conn.close()

if __name__ == '__main__':
    asyncio.run(test())
