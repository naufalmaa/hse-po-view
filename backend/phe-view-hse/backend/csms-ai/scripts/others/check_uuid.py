import asyncio
import uuid
from server.pipeline.rag import retrieve_evidence_chunks

async def main():
    contract_folder_id = '3d447636-9d58-4576-ac15-1827ff51b547'
    try:
        res = await retrieve_evidence_chunks(uuid.UUID(contract_folder_id), 50000)
        print(f"UUID len: {len(res)}")
    except Exception as e:
        print(f"UUID err: {e}")
        
    try:
        res2 = await retrieve_evidence_chunks(contract_folder_id, 50000)
        print(f"Str len: {len(res2)}")
    except Exception as e:
        print(f"Str err: {e}")

if __name__ == '__main__':
    asyncio.run(main())
