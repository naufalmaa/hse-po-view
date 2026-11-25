import asyncio
import asyncpg

async def test():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    try:
        res = await conn.fetch("SELECT 'a-b'::ltree")
        print("Success:", res)
    except Exception as e:
        print("Error:", e)
    await conn.close()

if __name__ == '__main__':
    asyncio.run(test())
