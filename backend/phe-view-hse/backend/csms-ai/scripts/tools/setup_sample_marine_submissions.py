import os
import json

def setup_samples():
    marine_dir = os.path.abspath(os.path.join("test_submissions", "marine"))
    os.makedirs(marine_dir, exist_ok=True)
    
    # 1. Kepemimpinan dan Komitmen (Score 10 expected)
    dir_1 = os.path.join(marine_dir, "1 Kepemimpinan dan Komitmen")
    os.makedirs(dir_1, exist_ok=True)
    with open(os.path.join(dir_1, "policy_commitment.txt"), "w", encoding="utf-8") as f:
        f.write("Manajemen puncak berkomitmen penuh terhadap K3LL melalui kebijakan resmi yang ditandatangani Direktur Utama pada 1 Januari 2026.")
        
    # 2. Kebijakan (Score 10 expected)
    dir_2 = os.path.join(marine_dir, "2 Kebijakan dan Sasaran Strategis K3LL")
    os.makedirs(dir_2, exist_ok=True)
    with open(os.path.join(dir_2, "kpi_sasaran_2026.csv"), "w", encoding="utf-8") as f:
        f.write("Sasaran,Target,Realisasi\\nZero Fatality,0,0\\nTRIR,<0.5,0.12\\nAudit K3LL,100%,100%")
        
    # 3.1 Struktur Organisasi (Empty folder to test auto expected_score = 0)
    dir_3_1 = os.path.join(marine_dir, "3.1 Struktur Organisasi")
    os.makedirs(dir_3_1, exist_ok=True)
    # No files added
    
    # 3.5 Pengelolaan K3LL Kontraktor (Score 10 expected)
    dir_3_5 = os.path.join(marine_dir, "3.5 Pengelolaan K3LL Kontraktor")
    os.makedirs(dir_3_5, exist_ok=True)
    with open(os.path.join(dir_3_5, "csms_subcon_manual.txt"), "w", encoding="utf-8") as f:
        f.write("Prosedur evaluasi CSMS untuk subkontraktor meliputi kualifikasi, prakualifikasi, audit lapangan, dan pemantauan kinerja HSE berkala.")
        
    # 8.2 Evaluasi Hasil Audit (Score 10 expected)
    dir_8_2 = os.path.join(marine_dir, "8.2 Evaluasi Hasil Audit")
    os.makedirs(dir_8_2, exist_ok=True)
    with open(os.path.join(dir_8_2, "audit_report_2025.json"), "w", encoding="utf-8") as f:
        json.dump({"audit_id": "AUD-2025-09", "status": "Closed", "findings": 0, "recommendations": "Maintain HSE excellence"}, f)
        
    # Ensure non-category folders exist
    for non_cat in ["archive", "random", "temp", "old_backup"]:
        os.makedirs(os.path.join(marine_dir, non_cat), exist_ok=True)
        with open(os.path.join(marine_dir, non_cat, "ignore_me.txt"), "w", encoding="utf-8") as f:
            f.write("This folder should be ignored by the category discovery engine.")
            
    print("SUCCESS: Sample marine submission dataset prepared.")

if __name__ == "__main__":
    setup_samples()
