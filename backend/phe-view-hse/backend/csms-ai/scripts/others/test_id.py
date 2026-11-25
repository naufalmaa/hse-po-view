import asyncio
import asyncpg

async def test():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    
    id_val = '43ac01c2-9b42-46bf-b8a9-4bec977c5788'
    
    row = await conn.fetchrow("SELECT id, name, file_type FROM csms_contract_folder WHERE id = $1", id_val)
    if row:
        print("Found in csms_contract_folder:", dict(row))
        
    row2 = await conn.fetchrow("SELECT id, file_name, file_type FROM csms_file WHERE id = $1", id_val)
    if row2:
        print("Found in csms_file:", dict(row2))
        
    await conn.close()

if __name__ == '__main__':
    asyncio.run(test())
