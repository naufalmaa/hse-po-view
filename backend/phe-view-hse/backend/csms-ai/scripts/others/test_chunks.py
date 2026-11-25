import asyncio
import asyncpg
import os
import re

async def test():
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    
    contract_folder_id = '3d447636-9d58-4576-ac15-1827ff51b547'
    
    # get chunks
    all_evidence_chunks = await conn.fetch(
        "SELECT id, content, metadata, file_path FROM csms_evidence_chunk WHERE contract_folder_id = $1",
        contract_folder_id
    )
    print("Total chunks:", len(all_evidence_chunks))
    
    target_names = {
        '3_SO_PT.SKJ.pdf', 
        '5_Surat_Penunjukan_Perwakilan_Direksi_Untuk_Visit_Management__Pak_Agus_.pdf', 
        '3_Management_Visit_CB.Clarisa_68_-_06_Februari_2025.pdf', 
        '3_Management_Visit_CB.Clarisa_68-03_September_2025.pdf', 
        '4_Surat_Penunjukan_Perwakilan_Direksi_Untuk_Visit_Management__Pak_Doto_.pdf', 
        '1_SOP_Management_Visit.pdf'
    }
    
    matches = 0
    for chunk in all_evidence_chunks:
        chunk_basename = os.path.basename(chunk["file_path"].replace('\\', '/'))
        clean_chunk_basename = re.sub(r'^\d{14}-', '', chunk_basename)
        if clean_chunk_basename in target_names:
            matches += 1
            
    print("Matched chunks for 1 Kepemimpinan dan Komitmen:", matches)
    
    await conn.close()

if __name__ == '__main__':
    asyncio.run(test())
