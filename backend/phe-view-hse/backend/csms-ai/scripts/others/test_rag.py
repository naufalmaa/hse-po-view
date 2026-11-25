import asyncio
import os
from server.pipeline.rag import retrieve_evidence_chunks

async def test():
    contract_folder_id = '3d447636-9d58-4576-ac15-1827ff51b547'
    chunks = await retrieve_evidence_chunks(contract_folder_id, limit=50000)
    print(f"Total chunks retrieved: {len(chunks)}")
    if len(chunks) > 0:
        print("Sample chunk file_path:", chunks[0]['file_path'])
        
        # Test the exact parsing logic from main.py
        import re
        def strip_timestamp(name: str) -> str:
            return re.sub(r'^\d{14}-', '', name)
            
        chunk_basename = os.path.basename(chunks[0]["file_path"].replace('\\', '/'))
        clean_chunk_basename = strip_timestamp(chunk_basename)
        print("chunk_basename:", chunk_basename)
        print("clean_chunk_basename:", clean_chunk_basename)
        
    else:
        print("NO CHUNKS RETRIEVED!")

if __name__ == '__main__':
    asyncio.run(test())
