import asyncio
import asyncpg

async def test():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    
    contract_id = '691b802b-8b30-4f94-8bd2-a60af7237773'
    roots = await conn.fetch("SELECT id, name, path FROM csms_contract_folder WHERE contract_id = $1 AND parent_id IS NULL", contract_id)
    
    for r in roots:
        print("Root:", r['id'], r['name'], r['path'])
        
    await conn.close()

if __name__ == '__main__':
    asyncio.run(test())
