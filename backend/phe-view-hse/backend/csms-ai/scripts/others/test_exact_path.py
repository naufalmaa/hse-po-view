import asyncio
from server.db import get_pool

async def test():
    pool = await get_pool()
    folder_id = '3d447636-9d58-4576-ac15-1827ff51b547'
    async with pool.acquire() as conn:
        # Get from contract folder
        files = await conn.fetch("SELECT file_path FROM csms_contract_folder WHERE contract_id = (SELECT contract_id FROM csms_contract_folder WHERE id = $1 LIMIT 1) AND file_type = 'file' LIMIT 10", folder_id)
        cf_paths = [r["file_path"] for r in files]
        
        # Get from evidence chunk
        chunks = await conn.fetch("SELECT DISTINCT file_path FROM csms_evidence_chunk WHERE contract_folder_id = $1 LIMIT 10", folder_id)
        ec_paths = [r["file_path"] for r in chunks]
        
        print("Contract folder paths:", cf_paths[:3])
        print("Evidence chunk paths:", ec_paths[:3])

if __name__ == '__main__':
    asyncio.run(test())
