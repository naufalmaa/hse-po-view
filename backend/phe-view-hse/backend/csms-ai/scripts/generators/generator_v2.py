import json
import os
import shutil

# Load parsed excel data
with open('excel_analysis.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

csms_data = data.get('csms', {}).get('rows', [])
validation_methods = data.get('VALIDATION_METHOD', {}).get('rows', [])

# Cleanup old directories to ensure clean state
dirs_to_clean = [
    "configs", "knowledge_base", "agents", "validators", "prompts", "schemas", "scoring", "audit_trail", "outputs"
]
for d in dirs_to_clean:
    if os.path.exists(d):
        shutil.rmtree(d)

# Create new directory structure
dirs = [
    "configs",
    "knowledge_base/marine/categories",
    "knowledge_base/marine/document_requirements",
    "knowledge_base/marine/validation_rules",
    "knowledge_base/marine/scoring_rules",
    "knowledge_base/marine/traceability",
    "knowledge_base/project/categories",
    "knowledge_base/project/document_requirements",
    "knowledge_base/project/validation_rules",
    "knowledge_base/project/scoring_rules",
    "knowledge_base/project/traceability",
    "agents/ingestion_agent",
    "agents/extraction_agent",
    "agents/validation_agent",
    "agents/scoring_agent",
    "agents/consensus_agent",
    "agents/reviewer_summary_agent",
    "agents/appeal_agent",
    "validators",
    "prompts",
    "schemas",
    "scoring",
    "audit_trail",
    "outputs"
]

for d in dirs:
    os.makedirs(d, exist_ok=True)

# Generate configs
configs = {
    "models.json": {"default_model": "gpt-4-turbo", "fallback_model": "gpt-3.5-turbo", "temperature": 0.0},
    "workflow.json": {"type": "sequential", "steps": ["ingestion", "extraction", "validation", "scoring", "consensus", "reviewer_summary"]},
    "scoring_policy.json": {"strict_mode": True, "escalate_on_missing": True}
}
for k, v in configs.items():
    with open(f"configs/{k}", "w", encoding="utf-8") as f:
        json.dump(v, f, indent=2)

hierarchy = {}
parents_set = set()
children_set = set()
total_rules = 0

for idx, row in enumerate(csms_data):
    if not row.get('element_category'):
        continue
        
    no = row.get('no')
    if no is None:
        continue
        
    try:
        no_float = float(no)
        # Check if it's like 1.0 or 2.0
        if no_float.is_integer():
            parent_id = str(int(no_float))
            child_id = str(int(no_float))
        else:
            parent_id = str(int(no_float))
            child_id = str(no)
    except ValueError:
        parent_id = "unknown"
        child_id = str(no)
        
    parents_set.add(parent_id)
    children_set.add(child_id)
    
    if parent_id not in hierarchy:
        hierarchy[parent_id] = []
    if child_id not in hierarchy[parent_id]:
        hierarchy[parent_id].append(child_id)

    # Title & Description
    cat_title = str(row.get('element_category', '')).replace('*', '').strip()
    cat_desc = str(row.get('element', '')).replace('*', '').strip()
    
    # 3. Category Definition
    category_json = {
        "category_id": child_id,
        "parent_category_id": parent_id,
        "title": cat_title,
        "description": cat_desc,
        "scoring_rule_reference": f"SR-{child_id}",
        "validation_rule_reference": f"VR-{child_id}",
        "document_requirement_reference": f"DR-{child_id}"
    }
    with open(f"knowledge_base/marine/categories/{child_id}.json", "w", encoding="utf-8") as f:
        json.dump(category_json, f, indent=2, ensure_ascii=False)
        total_rules += 1

    # 4. Document Requirements
    docs_raw = row.get('required_document', '')
    formats_raw = row.get('document_format', '')
    docs_list = [d.strip("- ") for d in str(docs_raw).split('\n') if d.strip("- ")]
    
    dr_json = {
        "requirement_id": f"DR-{child_id}",
        "category_id": child_id,
        "required_documents": docs_list,
        "optional_documents": [],
        "allowed_formats": [f.strip() for f in str(formats_raw).split(',')],
        "minimum_submission_completeness": row.get('ai_confidence_threshold', 0.8)
    }
    with open(f"knowledge_base/marine/document_requirements/DR-{child_id}.json", "w", encoding="utf-8") as f:
        json.dump(dr_json, f, indent=2, ensure_ascii=False)
        total_rules += 1

    # 5. Validation Rules
    vr_json = {
        "rule_id": f"VR-{child_id}",
        "category_id": child_id,
        "validation_methods": [m.strip() for m in str(row.get('validation_method', '')).split(',') if m.strip()],
        "ai_checkpoint_keywords": [k.strip() for k in str(row.get('ai_checkpoint_keywords', '')).split(',') if k.strip()],
        "document_expiry_check": bool(row.get('document_expiry_check')),
        "mandatory_fields": [m.strip("- ") for m in str(row.get('mandatory_fields', '')).split('\n') if m.strip("- ")]
    }
    with open(f"knowledge_base/marine/validation_rules/VR-{child_id}.json", "w", encoding="utf-8") as f:
        json.dump(vr_json, f, indent=2, ensure_ascii=False)
        total_rules += 1

    # 6. Scoring Rules
    sr_json = {
        "rule_id": f"SR-{child_id}",
        "category_id": child_id,
        "score_levels": {
            "0": row.get('score_0', ''),
            "3": row.get('score_3', ''),
            "6": row.get('score_6', ''),
            "10": row.get('score_10', '')
        },
        "reasoning_hint": row.get('ai_reasoning_hint', ''),
        "notes": row.get('notes', '')
    }
    with open(f"knowledge_base/marine/scoring_rules/SR-{child_id}.json", "w", encoding="utf-8") as f:
        json.dump(sr_json, f, indent=2, ensure_ascii=False)
        total_rules += 1

    # 7. Traceability
    tr_json = {
        "category_id": child_id,
        "source": {
            "sheet": "csms",
            "row": idx + 2, # Assuming header is row 1
            "columns_extracted": ["element_category", "element", "required_document", "document_format", "validation_method", "ai_checkpoint_keywords", "score_0", "score_3", "score_6", "score_10"]
        }
    }
    with open(f"knowledge_base/marine/traceability/TR-{child_id}.json", "w", encoding="utf-8") as f:
        json.dump(tr_json, f, indent=2, ensure_ascii=False)
        total_rules += 1

# 2. Hierarchy JSON
with open("knowledge_base/marine/hierarchy.json", "w", encoding="utf-8") as f:
    json.dump(hierarchy, f, indent=2)

# 8. Validators
standard_vals = ["date_validator", "expiry_validator", "signature_validator", 
                 "certificate_validator", "keyword_validator", "competency_validator",
                 "completeness_validator", "consistency_validator"]

# Extract any additional from validation_method sheet
for val in validation_methods:
    val_name = val.get('validation_method')
    if val_name and isinstance(val_name, str):
        v_id = val_name.strip()
        if v_id not in standard_vals:
            standard_vals.append(v_id)

for sv in standard_vals:
    with open(f"validators/{sv}.json", "w", encoding="utf-8") as f:
        json.dump({
            "validator_id": sv,
            "description": f"Capabilities for {sv}",
            "input_fields": ["document_content"],
            "output_fields": ["is_valid", "confidence", "reasoning"],
            "pass_condition": {"is_valid": True}
        }, f, indent=2)

# 9. Agents and 10. Prompts
agents = [
    "ingestion_agent", "extraction_agent", "validation_agent",
    "scoring_agent", "consensus_agent", "reviewer_summary_agent", "appeal_agent"
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
        f.write(f"SYSTEM PROMPT:\nYou are the {ag}.\n\nRULES:\n1. Prohibit hallucination.\n2. Prohibit assumptions.\n3. Require evidence citation.\n4. Require reasoning.\n5. Require confidence scoring.\n6. Return ONLY valid JSON complying with the schema.\n\nUse the provided configuration files as your sole source of truth.")

# 11. Schemas
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

# Count Required Documents
total_docs = 0
for row in csms_data:
    docs_raw = row.get('required_document', '')
    docs_list = [d for d in str(docs_raw).split('\n') if d.strip("- ")]
    total_docs += len(docs_list)

# Generate README.md
readme_content = """# Configuration-Driven AI Scoring Platform

This repository contains the configuration-driven AI Scoring Platform for Contractor Safety Management System (CSMS) evaluations.

## Structure
- `knowledge_base/marine/hierarchy.json`: Parent and Child Category Hierarchy.
- `knowledge_base/`: Contains categories, document requirements, validation rules, scoring rules, and traceability.
- `validators/`: Definitions for validation capabilities.
- `agents/`: Multi-agent system definitions (ingestion, extraction, validation, scoring, consensus, reviewer_summary_agent, appeal).
- `schemas/`: JSON Schema Draft 2020-12 schemas for I/O validation.
- `configs/`: Master workflows and policy configs.
"""
with open("README.md", "w", encoding="utf-8") as f:
    f.write(readme_content)

# 12. Implementation Report
report_content = f"""# Master Implementation Report

## Summary Statistics
- **Total Parent Categories**: {len(parents_set)}
- **Total Child Categories (Scoring Units)**: {len(children_set)}
- **Total Scoring Categories**: {len(children_set)}
- **Total Rules Generated**: {total_rules}
- **Total Validators Defined**: {len(standard_vals)}
- **Total Required Documents Parsed**: {total_docs}

## File Generation Log
"""
file_count = 0
for root, dirs, files in os.walk('.'):
    if '.venv' in root or '.git' in root:
        continue
    for file in files:
        if file.endswith('.json') or file.endswith('.md'):
            report_content += f"- `{os.path.join(root, file)}`\n"
            file_count += 1

report_content = report_content.replace("Total Rules Generated", f"Total Generated Files: {file_count}\n- Total Rules Generated")

with open("outputs/implementation_report.md", "w", encoding="utf-8") as f:
    f.write(report_content)

print(f"Master Implementation completed successfully! Total files: {file_count}")
