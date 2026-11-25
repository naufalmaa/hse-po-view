import asyncio
import asyncpg
import uuid

async def check_subfolder_scores():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    
    contract_folder_id = '3d447636-9d58-4576-ac15-1827ff51b547'
    folder = await conn.fetchrow("SELECT contract_id FROM csms_contract_folder WHERE id = $1", uuid.UUID(contract_folder_id))
    
    rows = await conn.fetch(
        """SELECT name, ai_score, ai_reasoning 
           FROM csms_contract_folder 
           WHERE contract_id = $1 AND file_type = 'folder'
             AND path <@ (SELECT path FROM csms_contract_folder WHERE id = $2)::ltree
           ORDER BY name""",
        folder['contract_id'],
        uuid.UUID(contract_folder_id)
    )
    
    for r in rows:
        reasoning = r['ai_reasoning'][:100] + "..." if r['ai_reasoning'] and len(r['ai_reasoning']) > 100 else r['ai_reasoning']
        print(f"Subfolder: {r['name']:<70} Score: {r['ai_score']:<5} Reasoning: {reasoning}")
        
    await conn.close()

if __name__ == '__main__':
    asyncio.run(check_subfolder_scores())
