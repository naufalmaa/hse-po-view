import asyncio
import asyncpg

async def test():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    
    contract_id = 'e746dcbf-78b0-4dbb-aaeb-ca7fc8e5dcdd'
    
    rows = await conn.fetch(
        """SELECT id, name, file_path, path, file_type FROM csms_contract_folder 
           WHERE contract_id = $1""",
        contract_id
    )
    print("Total items in contract:", len(rows))
    
    types = {}
    for r in rows:
        t = r['file_type']
        types[t] = types.get(t, 0) + 1
    print("File types:", types)
    
    for r in rows[:10]:
        print(f"id={r['id']}, type={r['file_type']}, name={r['name']}")
    
    await conn.close()

if __name__ == '__main__':
    asyncio.run(test())
