import asyncio
import asyncpg

async def test():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    
    try:
        row = await conn.fetchrow("SELECT 'a.b.c'::ltree <@ 'b'::ltree AS m")
        print("a.b.c <@ b :", row['m'])
        
        row2 = await conn.fetchrow("SELECT 'a.b.c'::ltree <@ 'a.b'::ltree AS m")
        print("a.b.c <@ a.b :", row2['m'])
        
    except Exception as e:
        print("Error:", e)
        
    await conn.close()

if __name__ == '__main__':
    asyncio.run(test())
