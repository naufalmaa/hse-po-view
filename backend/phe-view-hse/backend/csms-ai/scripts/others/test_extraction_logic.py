import asyncio
import asyncpg
import os
import uuid
import re

async def main():
    folder_id = '3d447636-9d58-4576-ac15-1827ff51b547' # Contract Root
    # Target a subfolder
    subfolder_id = '2fcc83f7-ff4e-4136-bce2-0d0790050c6e'
    # Wait, the subfolder of `3d447636-9d58-4576-ac15-1827ff51b547` for "1 Kepemimpinan dan Komitmen"
    # Let's find subfolders first
    conn = await asyncpg.connect('postgresql://postgres:a@localhost:5432/pheview_hse_devel')
    
    subfolders = await conn.fetch(
        """SELECT id, name, path FROM csms_contract_folder f
           WHERE f.contract_id = (SELECT contract_id FROM csms_contract_folder WHERE id = $1) 
             AND f.file_type = 'folder' 
             AND f.path <@ (SELECT path FROM csms_contract_folder WHERE id = $1)::ltree
           ORDER BY f.path""",
        uuid.UUID(folder_id)
    )
    scoreable = [sf for sf in subfolders if "SOP MVO Bab 2 Struktur" not in sf['name']][:2]
    # Actually just print scoreable
    for sf in subfolders:
        if "Kepemimpinan" in sf['name']:
            target_subfolder_id = str(sf['id'])
            print(f"Target subfolder: {sf['name']} ({target_subfolder_id})")
            
    folder_path = r'x:\naufal\Kerja\Kerja-an\Waviv\Project\PHE_HSE\apps-fullstack\backend\phe-view-hse\uploads\csms\contracts\691b802b-8b30-4f94-8bd2-a60af7237773\3d447636-9d58-4576-ac15-1827ff51b547'

    db_rows = await conn.fetch(
        """SELECT id, name, file_path, path, file_type FROM csms_contract_folder 
           WHERE path <@ (SELECT path FROM csms_contract_folder WHERE id = $1)::ltree""",
        uuid.UUID(folder_id),
    )
    db_records = {str(row["id"]): row for row in db_rows}
    print(f"Found {len(db_records)} records in DB under this root.")
    
    EXCLUDED_FILES = {'.ds_store', 'thumbs.db'}
    
    for target_subfolder_id in [str(sf['id']) for sf in subfolders if "Kepemimpinan" in sf['name']]:
        print(f"\n--- Extracting for target_subfolder_id: {target_subfolder_id} ---")
        collected_files = []
        for root, _dirs, files in os.walk(folder_path):
            for fname in files:
                if fname.lower() in EXCLUDED_FILES:
                    continue
                fpath = os.path.join(root, fname)
                
                potential_file_id = os.path.basename(root)
                file_row = None
                try:
                    uuid.UUID(potential_file_id)
                    if potential_file_id in db_records:
                        file_row = db_records[potential_file_id]
                except Exception:
                    pass

                if not file_row:
                    for row in db_rows:
                        if row["file_type"] == 'file':
                            row_file_path = row.get("file_path")
                            if row["name"] == fname or (row_file_path and os.path.basename(row_file_path) == fname):
                                file_row = row
                                break

                if file_row:
                    path_parts = file_row["path"].split('.')
                    if target_subfolder_id not in path_parts:
                        continue
                    print(f" MATCHED: {fname} (ID: {file_row['id']})")
                else:
                    if target_subfolder_id:
                        continue
                        
        print(f"Total matched for subfolder: {len(collected_files)}")

    await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
