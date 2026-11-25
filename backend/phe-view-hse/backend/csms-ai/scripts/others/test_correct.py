import asyncio
import asyncpg

async def test():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    
    contract_id = '691b802b-8b30-4f94-8bd2-a60af7237773'
    # contract_id from test: 3d447636-9d58-4576-ac15-1827ff51b547
    # wait, the test was on 3d447636-9d58-4576-ac15-1827ff51b547!
    # the test I ran used 691b802b-8b30-4f94-8bd2-a60af7237773 !! That's the WRONG contract id!
    
    contract_id_correct = '3d447636-9d58-4576-ac15-1827ff51b547'
    subfolders = await conn.fetch("SELECT id, name, path FROM csms_contract_folder WHERE contract_id = $1 AND name LIKE '1 Kepemimpinan%'", contract_id_correct)
    
    for sub in subfolders:
        print("Sub:", sub['name'], sub['path'])
        files = await conn.fetch("SELECT count(*) FROM csms_contract_folder WHERE contract_id = $1 AND file_type = 'file' AND path <@ $2::ltree", contract_id_correct, sub['path'])
        print("Files count:", files[0]['count'])
        
    await conn.close()

if __name__ == '__main__':
    asyncio.run(test())
