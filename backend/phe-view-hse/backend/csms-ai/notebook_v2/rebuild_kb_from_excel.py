#!/usr/bin/env python3
import json
import pandas as pd
from pathlib import Path
from typing import Dict, Any, List

EXCEL_PATH = Path("knowledge_base/marine/source/MARINE-kriteria_penilaian_CSMS_for_AI_rules_v4.xlsx")
KB_DIR = Path("knowledge_base/marine")
CATEGORIES_DIR = KB_DIR / "categories"
SCORING_RULES_DIR = KB_DIR / "scoring_rules"
VALIDATION_RULES_DIR = KB_DIR / "validation_rules"
DOC_REQUIREMENTS_DIR = KB_DIR / "document_requirements"
TRACEABILITY_DIR = KB_DIR / "traceability"

for d in [CATEGORIES_DIR, SCORING_RULES_DIR, VALIDATION_RULES_DIR, DOC_REQUIREMENTS_DIR, TRACEABILITY_DIR]:
    d.mkdir(parents=True, exist_ok=True)

HIERARCHY = {
    "1": ["1"],
    "2": ["2"],
    "3": ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6"],
    "4": ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7", "4.8"],
    "5": ["5.1", "5.2", "5.3", "5.4"],
    "6": ["6.1", "6.2", "6.3", "6.4", "6.5"],
    "7": ["7.1", "7.2"],
    "8": ["8.1", "8.2"]
}

KNOWN_VALIDATION_METHODS = {
    "keyword_search", "section_check", "signature_check", "date_validation",
    "table_check", "expiry_validator", "completeness_validator",
    "competency_validator", "consistency_validator", "certificate_validator",
    "ocr_image_processing", "semantic_search", "metadata_extraction_nlp",
    "signature_detection_computer_vision", "date_range_validation",
    "formula_metric_calculation", "cross_reference_roster_check"
}


def load_excel() -> pd.DataFrame:
    df = pd.read_excel(EXCEL_PATH, sheet_name="csms")
    return df


def clean_text(text: Any) -> str:
    if pd.isna(text) or text is None:
        return ""
    return str(text).strip()


def parse_keywords(text: Any) -> List[str]:
    if pd.isna(text) or text is None:
        return []
    keywords = []
    for sep in [',', ';', '\n']:
        if sep in str(text):
            keywords = [k.strip() for k in str(text).split(sep) if k.strip()]
            break
    if not keywords:
        keywords = [str(text).strip()]
    return keywords


def parse_validation_methods(text: Any) -> List[str]:
    if pd.isna(text) or text is None:
        return []
    methods = []
    text_str = str(text)
    for sep in [',', ';', '\n']:
        if sep in text_str:
            methods = [m.strip().lower().replace(' ', '_') for m in text_str.split(sep) if m.strip()]
            break
    if not methods:
        methods = [text_str.strip().lower().replace(' ', '_')]
    methods = [m for m in methods if m]
    return methods


def parse_boolean(text: Any) -> bool:
    if pd.isna(text) or text is None:
        return False
    text_str = str(text).strip().lower()
    return text_str in ['true', '1', 'yes', 'ya', 'ada']


def normalize_cat_id(cat_id: str) -> str:
    if cat_id.endswith('.0'):
        return cat_id[:-2]
    return cat_id


def get_parent_category(cat_id: str) -> str:
    norm_id = normalize_cat_id(cat_id)
    for parent, children in HIERARCHY.items():
        if norm_id in children:
            return parent
    return norm_id.split('.')[0] if '.' in norm_id else norm_id


def build_category_json(row: pd.Series) -> Dict[str, Any]:
    cat_id = str(row['no'])
    norm_id = normalize_cat_id(cat_id)
    parent_id = get_parent_category(norm_id)

    return {
        "category_id": norm_id,
        "parent_category_id": parent_id,
        "title": clean_text(row['element']),
        "description": clean_text(row['element_category']),
        "required_document": clean_text(row['required_document']),
        "evaluation_criteria": clean_text(row['evaluation_criteria']),
        "mandatory_fields": clean_text(row['mandatory_fields']),
        "document_format": clean_text(row['document_format']),
        "scoring_rule_reference": f"SR-{norm_id}",
        "validation_rule_reference": f"VR-{norm_id}",
        "document_requirement_reference": f"DR-{norm_id}",
        "status_accept": clean_text(row['status_accept']),
        "status_reject": clean_text(row['status_reject']),
        "status_revision": clean_text(row['status_revision']),
        "validation_method": clean_text(row['validation_method']),
        "ai_checkpoint_keywords": parse_keywords(row['ai_checkpoint_keywords']),
        "document_expiry_check": parse_boolean(row['document_expiry_check']),
        "ai_confidence_threshold": float(row['ai_confidence_threshold']) if not pd.isna(row['ai_confidence_threshold']) else 0.85,
        "ai_reasoning_hint": clean_text(row['ai_reasoning_hint']),
        "notes": clean_text(row['notes']),
        "kb_version": "v4"
    }


def build_scoring_rules_json(row: pd.Series) -> Dict[str, Any]:
    cat_id = str(row['no'])
    norm_id = normalize_cat_id(cat_id)

    return {
        "rule_id": f"SR-{norm_id}",
        "category_id": norm_id,
        "score_levels": {
            "0": clean_text(row['score_0']),
            "3": clean_text(row['score_3']),
            "6": clean_text(row['score_6']),
            "10": clean_text(row['score_10'])
        },
        "evaluation_criteria": clean_text(row['evaluation_criteria']),
        "mandatory_fields": clean_text(row['mandatory_fields']),
        "reasoning_hint": clean_text(row['ai_reasoning_hint']),
        "notes": clean_text(row['notes']),
        "kb_version": "v4"
    }


def build_validation_rules_json(row: pd.Series) -> Dict[str, Any]:
    cat_id = str(row['no'])
    norm_id = normalize_cat_id(cat_id)

    return {
        "rule_id": f"VR-{norm_id}",
        "category_id": norm_id,
        "validation_methods": parse_validation_methods(row['validation_method']),
        "ai_checkpoint_keywords": parse_keywords(row['ai_checkpoint_keywords']),
        "document_expiry_check": parse_boolean(row['document_expiry_check']),
        "mandatory_fields": parse_keywords(row['mandatory_fields']),
        "evaluation_criteria": clean_text(row['evaluation_criteria']),
        "status_accept": clean_text(row['status_accept']),
        "status_reject": clean_text(row['status_reject']),
        "status_revision": clean_text(row['status_revision']),
        "ai_confidence_threshold": float(row['ai_confidence_threshold']) if not pd.isna(row['ai_confidence_threshold']) else 0.85,
        "kb_version": "v4"
    }


def build_document_requirements_json(row: pd.Series) -> Dict[str, Any]:
    cat_id = str(row['no'])
    norm_id = normalize_cat_id(cat_id)

    required_docs = parse_keywords(row['required_document'])
    allowed_formats = parse_keywords(row['document_format'])

    return {
        "requirement_id": f"DR-{norm_id}",
        "category_id": norm_id,
        "required_documents": required_docs,
        "optional_documents": [],
        "allowed_formats": allowed_formats,
        "minimum_submission_completeness": 0.9,
        "kb_version": "v4"
    }


def build_traceability_json(row: pd.Series) -> Dict[str, Any]:
    cat_id = str(row['no'])
    norm_id = normalize_cat_id(cat_id)

    return {
        "category_id": norm_id,
        "source": {
            "sheet": "csms",
            "file": EXCEL_PATH.name,
            "row": int(row.name) + 2,
            "columns_extracted": [
                "element_category", "element", "required_document", "document_format",
                "evaluation_criteria", "mandatory_fields", "score_0", "score_3", "score_6", "score_10",
                "status_accept", "status_reject", "status_revision",
                "validation_method", "ai_checkpoint_keywords", "document_expiry_check",
                "ai_confidence_threshold", "ai_reasoning_hint", "notes"
            ]
        }
    }


def rebuild_kb():
    print("Loading Excel data from v4...")
    df = load_excel()

    print(f"Processing {len(df)} categories...")

    processed = []
    errors = []
    unknown_methods = set()

    for idx, row in df.iterrows():
        cat_id = str(row['no'])
        norm_id = normalize_cat_id(cat_id)
        try:
            print(f"  Processing {norm_id}...")

            category_json = build_category_json(row)
            scoring_json = build_scoring_rules_json(row)
            validation_json = build_validation_rules_json(row)
            doc_req_json = build_document_requirements_json(row)
            traceability_json = build_traceability_json(row)

            for m in validation_json["validation_methods"]:
                if m not in KNOWN_VALIDATION_METHODS:
                    unknown_methods.add(m)

            with open(CATEGORIES_DIR / f"{norm_id}.json", 'w', encoding='utf-8') as f:
                json.dump(category_json, f, indent=2, ensure_ascii=False)

            with open(SCORING_RULES_DIR / f"SR-{norm_id}.json", 'w', encoding='utf-8') as f:
                json.dump(scoring_json, f, indent=2, ensure_ascii=False)

            with open(VALIDATION_RULES_DIR / f"VR-{norm_id}.json", 'w', encoding='utf-8') as f:
                json.dump(validation_json, f, indent=2, ensure_ascii=False)

            with open(DOC_REQUIREMENTS_DIR / f"DR-{norm_id}.json", 'w', encoding='utf-8') as f:
                json.dump(doc_req_json, f, indent=2, ensure_ascii=False)

            with open(TRACEABILITY_DIR / f"TR-{norm_id}.json", 'w', encoding='utf-8') as f:
                json.dump(traceability_json, f, indent=2, ensure_ascii=False)

            processed.append(norm_id)

        except Exception as e:
            errors.append({"category": norm_id, "error": str(e)})
            print(f"  ERROR on {norm_id}: {e}")

    print(f"\n=== REBUILD COMPLETE (v4) ===")
    print(f"Successfully processed: {len(processed)} categories")
    if errors:
        print(f"Errors: {len(errors)}")
        for err in errors:
            print(f"  {err['category']}: {err['error']}")
    if unknown_methods:
        print(f"\n[WARN] Unknown validation methods found in v4 Excel: {unknown_methods}")

    print("\n=== VERIFICATION ===")
    print(f"Categories: {len(list(CATEGORIES_DIR.glob('*.json')))} files")
    print(f"Scoring Rules: {len(list(SCORING_RULES_DIR.glob('*.json')))} files")
    print(f"Validation Rules: {len(list(VALIDATION_RULES_DIR.glob('*.json')))} files")
    print(f"Document Requirements: {len(list(DOC_REQUIREMENTS_DIR.glob('*.json')))} files")
    print(f"Traceability: {len(list(TRACEABILITY_DIR.glob('*.json')))} files")

    print("\n=== SAMPLE: Category 8.1 ===")
    with open(CATEGORIES_DIR / "8.1.json", 'r', encoding='utf-8') as f:
        cat = json.load(f)
    print(f"  kb_version: {cat.get('kb_version')}")
    print(f"  title: {cat.get('title', 'N/A')[:80]}...")
    print(f"  required_document: {cat.get('required_document', 'N/A')[:80]}...")

    with open(VALIDATION_RULES_DIR / "VR-8.1.json", 'r', encoding='utf-8') as f:
        vr = json.load(f)
    print(f"  validation_methods: {vr.get('validation_methods')}")
    print(f"  ai_confidence_threshold: {vr.get('ai_confidence_threshold')}")

    print("\n=== ALL VALIDATION METHODS PER CATEGORY ===")
    for cat_id in processed:
        with open(VALIDATION_RULES_DIR / f"VR-{cat_id}.json", 'r', encoding='utf-8') as f:
            vr = json.load(f)
        print(f"  {cat_id}: {vr.get('validation_methods', [])}")


if __name__ == "__main__":
    rebuild_kb()
