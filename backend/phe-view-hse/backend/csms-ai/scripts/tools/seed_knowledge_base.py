import os
import json
import asyncio
import asyncpg
import sys

# Add server directory to path so we can import config
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from server.config import DATABASE_URL
from server.db import get_pool, close_pool

KB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "knowledge_base", "marine"))
CATEGORIES_DIR = os.path.join(KB_DIR, "categories")
SCORING_DIR = os.path.join(KB_DIR, "scoring_rules")
VALIDATION_DIR = os.path.join(KB_DIR, "validation_rules")
DOC_REQ_DIR = os.path.join(KB_DIR, "document_requirements")

def clean_html(text):
    if not isinstance(text, str):
        return text
    text = text.replace("<br>", "\n").replace("<br/>", "\n").replace("<br />", "\n")
    return text.strip()

def clean_array(arr):
    if not isinstance(arr, list):
        return arr
    cleaned = []
    for item in arr:
        if isinstance(item, str):
            cleaned.append(clean_html(item))
        else:
            cleaned.append(item)
    return cleaned

async def main():
    pool = await get_pool()
    
    if not os.path.exists(CATEGORIES_DIR):
        print(f"Categories directory not found: {CATEGORIES_DIR}")
        return
        
    for filename in os.listdir(CATEGORIES_DIR):
        if not filename.endswith(".json"):
            continue
            
        cat_path = os.path.join(CATEGORIES_DIR, filename)
        with open(cat_path, "r", encoding="utf-8") as f:
            cat_data = json.load(f)
            
        cat_id = cat_data.get("category_id")
        if not cat_id:
            continue
            
        print(f"Processing category {cat_id}...")
        
        # Load related data
        sr_path = os.path.join(SCORING_DIR, f"SR-{cat_id}.json")
        sr_data = {}
        if os.path.exists(sr_path):
            with open(sr_path, "r", encoding="utf-8") as f:
                sr_data = json.load(f)
                
        vr_path = os.path.join(VALIDATION_DIR, f"VR-{cat_id}.json")
        vr_data = {}
        if os.path.exists(vr_path):
            with open(vr_path, "r", encoding="utf-8") as f:
                vr_data = json.load(f)
                
        dr_path = os.path.join(DOC_REQ_DIR, f"DR-{cat_id}.json")
        dr_data = {}
        if os.path.exists(dr_path):
            with open(dr_path, "r", encoding="utf-8") as f:
                dr_data = json.load(f)
                
        # Clean up structures
        # Document Requirements
        if "required_documents" in dr_data:
            # Join mangled array elements caused by improper split by comma
            # They usually start with "- " and contain commas.
            joined_docs = ", ".join(dr_data["required_documents"])
            joined_docs = clean_html(joined_docs)
            docs_list = [d.strip() for d in joined_docs.split("- ") if d.strip()]
            dr_data["required_documents_clean"] = docs_list
            
        # User Context (Merge cat_data text fields)
        user_context_parts = []
        if "required_document" in cat_data:
            user_context_parts.append(f"### Required Documents\n{clean_html(cat_data['required_document'])}")
        if "evaluation_criteria" in cat_data:
            user_context_parts.append(f"### Evaluation Criteria\n{clean_html(cat_data['evaluation_criteria'])}")
        if "mandatory_fields" in cat_data:
            # Reformat to markdown code block
            mf = clean_html(cat_data['mandatory_fields'])
            mf = mf.replace("JSON METADATA SCHEMA FOR AI EXTRACTION:", "JSON METADATA SCHEMA FOR AI EXTRACTION:\n```json")
            mf += "\n```"
            user_context_parts.append(f"### Mandatory Fields\n{mf}")
        
        keywords = cat_data.get("ai_checkpoint_keywords", [])
        if keywords:
            user_context_parts.append(f"### Checkpoint Keywords\n{', '.join(clean_array(keywords))}")
            
        if "ai_reasoning_hint" in cat_data:
            user_context_parts.append(f"### Reasoning Hint\n{clean_html(cat_data['ai_reasoning_hint'])}")
            
        user_context = "\n\n".join(user_context_parts)
        
        # Scoring Rules cleanup
        if "score_levels" in sr_data:
            for k, v in sr_data["score_levels"].items():
                sr_data["score_levels"][k] = clean_html(v)
                
        # Validation Rules cleanup
        if "mandatory_fields" in vr_data and isinstance(vr_data["mandatory_fields"], list):
            vr_data["mandatory_fields"] = clean_html(", ".join(vr_data["mandatory_fields"]))
                
        title = cat_data.get("title", "")
        description = cat_data.get("description", "")
        
        # Remove asterisks from title and description
        title = title.replace("*", "").strip()
        description = description.replace("*", "").strip()
        
        # Upsert into database
        query = """
            INSERT INTO csms_knowledge_base 
                (category_id, title, description, document_requirements, validation_rules, scoring_rules, user_context)
            VALUES 
                ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (category_id) DO UPDATE SET
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                document_requirements = EXCLUDED.document_requirements,
                validation_rules = EXCLUDED.validation_rules,
                scoring_rules = EXCLUDED.scoring_rules,
                user_context = EXCLUDED.user_context,
                updated_at = NOW()
        """
        
        async with pool.acquire() as conn:
            await conn.execute(
                query,
                cat_id,
                title,
                description,
                json.dumps(dr_data),
                json.dumps(vr_data),
                json.dumps(sr_data),
                user_context
            )
            
    await close_pool()
    print("Seeding complete.")

if __name__ == "__main__":
    asyncio.run(main())
