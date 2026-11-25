import asyncio
import asyncpg
import uuid

async def test_evaluation():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    
    contract_folder_id = '3d447636-9d58-4576-ac15-1827ff51b547'
    
    # Check current score
    row = await conn.fetchrow("SELECT ai_score, ai_reasoning FROM csms_contract_folder WHERE id = $1", uuid.UUID(contract_folder_id))
    print(f"Current score before: {row['ai_score']}")
    
    # create a dummy job
    job_id = str(uuid.uuid4())
    await conn.execute(
        """INSERT INTO csms_ai_evaluation_job (id, contract_folder_id, status)
           VALUES ($1, $2, 'pending')""",
        uuid.UUID(job_id),
        uuid.UUID(contract_folder_id)
    )
    
    print(f"Started job: {job_id}")
    
    # run evaluation
    from server.main import _process_evaluation
    await _process_evaluation(job_id, contract_folder_id)
    
    row = await conn.fetchrow("SELECT ai_score, ai_reasoning FROM csms_contract_folder WHERE id = $1", uuid.UUID(contract_folder_id))
    print(f"Current score after: {row['ai_score']}")
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(test_evaluation())
