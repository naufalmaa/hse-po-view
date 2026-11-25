import asyncio
import asyncpg
import json
import uuid

async def main():
    folder_id = '3d447636-9d58-4576-ac15-1827ff51b547'
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    
    # Let's get the jobs that ran for this contract folder
    jobs = await conn.fetch("SELECT * FROM csms_ai_evaluation_job WHERE contract_folder_id = $1 ORDER BY created_at DESC LIMIT 5", uuid.UUID(folder_id))
    
    for j in jobs:
        print(f"Job ID: {j['id']}, Status: {j['status']}, Progress: {j['progress_message']}")
        
    await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
