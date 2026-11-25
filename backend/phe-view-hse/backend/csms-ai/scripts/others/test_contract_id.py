import asyncio
import asyncpg

async def test():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    
    contract_folder_id = '3d447636-9d58-4576-ac15-1827ff51b547'
    folder = await conn.fetchrow("SELECT contract_id FROM csms_contract_folder WHERE id = $1", contract_folder_id)
    print("contract_id is:", folder['contract_id'])
    
    # Let's count the subfolders
    subfolders = await conn.fetch("SELECT id, name, path FROM csms_contract_folder WHERE contract_id = $1 LIMIT 5", folder['contract_id'])
    for sub in subfolders:
        print("Sub:", sub['name'], sub['path'])
        
    await conn.close()

if __name__ == '__main__':
    asyncio.run(test())
