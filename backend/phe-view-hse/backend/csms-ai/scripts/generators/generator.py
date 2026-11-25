import json
import os
import re

# Load parsed excel data
with open('excel_analysis.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

csms_data = data.get('csms', {}).get('rows', [])
validation_methods = data.get('VALIDATION_METHOD', {}).get('rows', [])
document_formats = data.get('DOCUMENT_FORMAT', {}).get('rows', [])

# 1. Directories
dirs = [
    "configs",
    "knowledge_base/marine/categories",
    "knowledge_base/marine/document_requirements",
    "knowledge_base/marine/validation_rules",
    "knowledge_base/marine/scoring_rules",
    "knowledge_base/marine/glossary",
    "knowledge_base/project/categories",
    "knowledge_base/project/document_requirements",
    "knowledge_base/project/validation_rules",
    "knowledge_base/project/scoring_rules",
    "knowledge_base/project/glossary",
    "agents/ingestion_agent",
    "agents/extraction_agent",
    "agents/validation_agent",
    "agents/scoring_agent",
    "agents/consensus_agent",
    "agents/reviewer_agent",
    "agents/appeal_agent",
    "validators",
    "prompts",
    "schemas",
    "scoring",
    "audit_trail",
    "outputs",
    "tests"
]

for d in dirs:
    os.makedirs(d, exist_ok=True)

# Helper to sanitize and format category ID
def get_category_id(row, index):
    no = row.get('no')
    if no is not None:
        try:
            return str(int(float(no)))
        except ValueError:
            pass
    return str(index + 1)

# Keep track of glossary terms
glossary = set()

for idx, row in enumerate(csms_data):
    if not row.get('element_category'):
        continue
        
    cat_id = get_category_id(row, idx)
    
    # Extract terms for glossary
    kw = row.get('ai_checkpoint_keywords', '')
    if kw:
        for term in kw.split(','):
            term = term.strip()
            if term:
                glossary.add(term)

    # 2. Category JSON
    category_json = {
        "category_id": cat_id,
        "category_name": str(row.get('element_category', '')).replace('*', '').strip(),
        "description": str(row.get('element', '')).replace('*', '').strip(),
        "document_requirement_id": f"DR-{cat_id}",
        "validation_rule_id": f"VR-{cat_id}",
        "scoring_rule_id": f"SR-{cat_id}",
        "metadata": {
            "source": {
                "sheet": "csms",
                "row": idx + 2, # Header is 1
            }
        }
    }
    with open(f"knowledge_base/marine/categories/{cat_id}.json", "w", encoding="utf-8") as f:
        json.dump(category_json, f, indent=2, ensure_ascii=False)
        
    # 3. Document Requirements
    docs_raw = row.get('required_document', '')
    formats_raw = row.get('document_format', '')
    docs_list = [d.strip("- ") for d in str(docs_raw).split('\n') if d.strip("- ")]
    
    dr_json = {
        "requirement_id": f"DR-{cat_id}",
        "category_id": cat_id,
        "required_documents": docs_list,
        "optional_documents": [],
        "allowed_formats": [f.strip() for f in str(formats_raw).split(',')],
        "minimum_submission_completeness": row.get('ai_confidence_threshold', 0.8),
        "metadata": {
            "source": {
                "sheet": "csms",
                "row": idx + 2,
                "column": "required_document"
            }
        }
    }
    with open(f"knowledge_base/marine/document_requirements/DR-{cat_id}.json", "w", encoding="utf-8") as f:
        json.dump(dr_json, f, indent=2, ensure_ascii=False)
        
    # 4. Validation Rules
    vr_json = {
        "rule_id": f"VR-{cat_id}",
        "category_id": cat_id,
        "validation_methods": [m.strip() for m in str(row.get('validation_method', '')).split(',') if m.strip()],
        "ai_checkpoint_keywords": [k.strip() for k in str(row.get('ai_checkpoint_keywords', '')).split(',') if k.strip()],
        "document_expiry_check": bool(row.get('document_expiry_check')),
        "mandatory_fields": [m.strip("- ") for m in str(row.get('mandatory_fields', '')).split('\n') if m.strip("- ")],
        "metadata": {
            "source": {
                "sheet": "csms",
                "row": idx + 2
            }
        }
    }
    with open(f"knowledge_base/marine/validation_rules/VR-{cat_id}.json", "w", encoding="utf-8") as f:
        json.dump(vr_json, f, indent=2, ensure_ascii=False)
        
    # 5. Scoring Rules
    sr_json = {
        "rule_id": f"SR-{cat_id}",
        "category_id": cat_id,
        "score_levels": {
            "0": row.get('score_0', ''),
            "3": row.get('score_3', ''),
            "6": row.get('score_6', ''),
            "10": row.get('score_10', '')
        },
        "reasoning_hint": row.get('ai_reasoning_hint', ''),
        "notes": row.get('notes', ''),
        "metadata": {
            "source": {
                "sheet": "csms",
                "row": idx + 2
            }
        }
    }
    with open(f"knowledge_base/marine/scoring_rules/SR-{cat_id}.json", "w", encoding="utf-8") as f:
        json.dump(sr_json, f, indent=2, ensure_ascii=False)

# 6. Glossary
glossary_json = {
    "terms": [{"term": t, "definition": "Extracted from CSMS requirements"} for t in sorted(list(glossary))]
}
with open("knowledge_base/marine/glossary/glossary.json", "w", encoding="utf-8") as f:
    json.dump(glossary_json, f, indent=2, ensure_ascii=False)

# 7. Validator Definitions
for val in validation_methods:
    val_name = val.get('validation_method')
    if val_name and isinstance(val_name, str):
        v_id = val_name.strip()
        desc = val.get('Deskripsi', '')
        v_json = {
            "validator_id": v_id,
            "description": desc,
            "input_fields": ["document_content"],
            "output_fields": ["is_valid", "confidence", "reasoning"],
            "pass_condition": {"is_valid": True}
        }
        with open(f"validators/{v_id}.json", "w", encoding="utf-8") as f:
            json.dump(v_json, f, indent=2, ensure_ascii=False)

# Ensure some standard validators exist if the sheet was missing them
standard_vals = ["date_validator", "expiry_validator", "signature_validator", 
                 "completeness_validator", "competency_validator", 
                 "consistency_validator", "keyword_validator"]
for sv in standard_vals:
    if not os.path.exists(f"validators/{sv}.json"):
        with open(f"validators/{sv}.json", "w", encoding="utf-8") as f:
            json.dump({
                "validator_id": sv,
                "description": f"Standard {sv}",
                "input_fields": ["document_content"],
                "output_fields": ["is_valid", "confidence", "reasoning"],
                "pass_condition": {"is_valid": True}
            }, f, indent=2)

# 8 & 9. Agents and Prompts
agents = [
    "ingestion_agent", "extraction_agent", "validation_agent",
    "scoring_agent", "consensus_agent", "reviewer_agent", "appeal_agent"
]

for ag in agents:
    # agent.json
    with open(f"agents/{ag}/agent.json", "w", encoding="utf-8") as f:
        json.dump({"agent_id": ag, "name": ag.replace('_', ' ').title(), "type": "model-agnostic"}, f, indent=2)
    # role.md
    with open(f"agents/{ag}/role.md", "w", encoding="utf-8") as f:
        f.write(f"# Role: {ag}\nYou are a highly skilled AI acting as the {ag.replace('_', ' ').title()}.")
    # responsibilities.md
    with open(f"agents/{ag}/responsibilities.md", "w", encoding="utf-8") as f:
        f.write(f"# Responsibilities\n- Execute {ag} tasks.\n- Adhere to CSMS rules.")
    # prompt.md
    with open(f"agents/{ag}/prompt.md", "w", encoding="utf-8") as f:
        f.write(f"SYSTEM PROMPT:\nYou are the {ag}.\n\nRULES:\n1. Prevent hallucination.\n2. Prohibit assumptions.\n3. Require evidence citation.\n4. Require reasoning.\n5. Require confidence scoring.\n6. Return ONLY valid JSON complying with the schema.\n\nUse the provided configuration files as your sole source of truth.")

# 10. Schemas
schemas = ["evidence", "validation", "score_request", "score_result", "consensus", "reviewer", "audit"]
for s in schemas:
    schema_json = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": f"https://example.com/{s}.schema.json",
        "title": s.title(),
        "type": "object",
        "properties": {}
    }
    with open(f"schemas/{s}.schema.json", "w", encoding="utf-8") as f:
        json.dump(schema_json, f, indent=2)

# 11. Scoring Engine Configuration
engine_configs = {
    "score_engine": {
        "allowed_scores": [0, 3, 6, 10],
        "human_review_mandatory": True,
        "score_justification_mandatory": True
    },
    "confidence_engine": {
        "minimum_confidence_threshold": 0.8,
        "require_human_on_low_confidence": True
    },
    "escalation_engine": {
        "escalate_on_missing_evidence": True,
        "escalate_on_conflict": True
    }
}
for name, conf in engine_configs.items():
    with open(f"scoring/{name}.json", "w", encoding="utf-8") as f:
        json.dump(conf, f, indent=2)

# 12. README
readme_content = """# Configuration-Driven AI Scoring Platform

This repository contains the configuration-driven AI Scoring Platform for Contractor Safety Management System (CSMS) evaluations.

## Architecture Principles
1. **Configuration Driven**: Scoring logic resides inside `knowledge_base/`. No logic is hardcoded.
2. **Explainable AI**: Every score includes evidence, missing evidence, reasoning, and confidence.
3. **Auditable**: Every decision is traceable back to the source Excel document.
4. **Category-Agnostic Agents**: Agents process configurations dynamically.
5. **Future-Proof**: Supports both `marine/` and `project/` knowledge bases.

## Structure
- `knowledge_base/`: Contains categories, document requirements, validation rules, scoring rules, and glossary.
- `validators/`: Definitions for validation capabilities.
- `agents/`: Multi-agent system definitions (ingestion, extraction, validation, scoring, consensus, reviewer, appeal).
- `schemas/`: JSON schemas for I/O validation.
- `scoring/`: Core engine configurations.
"""
with open("README.md", "w", encoding="utf-8") as f:
    f.write(readme_content)

print("Generation completed successfully!")
