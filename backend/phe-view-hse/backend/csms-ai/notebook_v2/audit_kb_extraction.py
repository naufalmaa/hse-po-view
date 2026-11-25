"""
Audit KB extraction: compare Excel source vs current JSON files
"""
import json
import pandas as pd
from pathlib import Path

# Load Excel source
excel_path = Path("knowledge_base/marine/source/MARINE-kriteria_penilaian_CSMS_for_AI_rules_v3.xlsx")
df = pd.read_excel(excel_path, sheet_name="csms")

print(f"Excel has {len(df)} rows (categories)")
print(f"Columns: {df.columns.tolist()}")

# Expected columns from Excel
excel_fields = {
    "element_category": "Category group",
    "element": "Element name/title",
    "required_document": "Required documents list",
    "evaluation_criteria": "Detailed evaluation criteria",
    "mandatory_fields": "Mandatory fields to check",
    "score_0": "Score 0 description",
    "score_3": "Score 3 description",
    "score_6": "Score 6 description",
    "score_10": "Score 10 description",
    "validation_method": "Validation methods",
    "ai_checkpoint_keywords": "AI checkpoint keywords",
    "document_expiry_check": "Document expiry check flag",
    "ai_reasoning_hint": "AI reasoning hints",
    "notes": "Additional notes"
}

print("\n=== Excel Field Summary ===")
for field, desc in excel_fields.items():
    if field in df.columns:
        non_null = df[field].notna().sum()
        print(f"  {field}: {non_null}/{len(df)} rows have data")

# Check existing JSON files
kb_dir = Path("knowledge_base/marine")
categories_dir = kb_dir / "categories"
scoring_rules_dir = kb_dir / "scoring_rules"
validation_rules_dir = kb_dir / "validation_rules"
document_requirements_dir = kb_dir / "document_requirements"

print("\n=== Current JSON File Counts ===")
print(f"  categories/: {len(list(categories_dir.glob('*.json')))} files")
print(f"  scoring_rules/: {len(list(scoring_rules_dir.glob('*.json')))} files")
print(f"  validation_rules/: {len(list(validation_rules_dir.glob('*.json')))} files")
print(f"  document_requirements/: {len(list(document_requirements_dir.glob('*.json')))} files")

# Sample comparison: category 8.1
print("\n=== Sample Comparison: Category 8.1 ===")
excel_row = df[df['element_category'] == 'Sertifikasi Sistem Manajemen K3LL'].iloc[0]

# Load existing JSON files
with open(categories_dir / "8.1.json", 'r', encoding='utf-8') as f:
    cat_json = json.load(f)

with open(scoring_rules_dir / "SR-8.1.json", 'r', encoding='utf-8') as f:
    sr_json = json.load(f)

with open(validation_rules_dir / "VR-8.1.json", 'r', encoding='utf-8') as f:
    vr_json = json.load(f)

dr_path = document_requirements_dir / "DR-8.1.json"
if dr_path.exists():
    with open(dr_path, 'r', encoding='utf-8') as f:
        dr_json = json.load(f)
else:
    dr_json = None

print("\nExcel source (8.1):")
print(f"  element_category: {excel_row['element_category']}")
print(f"  element: {excel_row['element']}")
print(f"  required_document length: {len(str(excel_row['required_document']))} chars")
print(f"  evaluation_criteria length: {len(str(excel_row['evaluation_criteria']))} chars")
print(f"  mandatory_fields length: {len(str(excel_row['mandatory_fields']))} chars")
print(f"  ai_reasoning_hint length: {len(str(excel_row['ai_reasoning_hint']))} chars")

print("\nCurrent JSON (8.1):")
print(f"  categories/8.1.json has {len(cat_json)} fields")
print(f"    Fields: {list(cat_json.keys())}")
print(f"  scoring_rules/SR-8.1.json has {len(sr_json)} fields")
print(f"    Fields: {list(sr_json.keys())}")
print(f"    score_levels: {list(sr_json.get('score_levels', {}).keys())}")
print(f"  validation_rules/VR-8.1.json has {len(vr_json)} fields")
print(f"    Fields: {list(vr_json.keys())}")
if dr_json:
    print(f"  document_requirements/DR-8.1.json has {len(dr_json)} fields")
else:
    print(f"  document_requirements/DR-8.1.json: MISSING")

# Identify missing fields
print("\n=== Missing Fields Analysis ===")
print("categories/*.json should have:")
print("  - title (from 'element')")
print("  - description (from 'element' + 'element_category')")
print("  - required_document (from 'required_document')")
print("  - evaluation_criteria (from 'evaluation_criteria')")
print("  - mandatory_fields (from 'mandatory_fields')")
print("\nscoring_rules/SR-*.json should have:")
print("  - evaluation_criteria (from 'evaluation_criteria')")
print("  - mandatory_fields (from 'mandatory_fields')")
print("  - reasoning_hint (from 'ai_reasoning_hint', currently minimal)")
print("\nvalidation_rules/VR-*.json should have:")
print("  - evaluation_criteria (from 'evaluation_criteria')")
print("  - status_accept (from 'status_accept')")
print("  - status_reject (from 'status_reject')")
print("  - status_revision (from 'status_revision')")
print("  - ai_confidence_threshold (from 'ai_confidence_threshold')")
print("\ndocument_requirements/DR-*.json:")
print("  - Many categories missing this file (only 12/29 exist)")
