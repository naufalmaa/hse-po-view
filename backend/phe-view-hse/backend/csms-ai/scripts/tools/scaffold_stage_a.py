import os
import json

def scaffold():
    dirs = [
        "notebook",
        "engine",
        "engine/extractors",
        "engine/aggregators",
        "engine/validators",
        "engine/jurors",
        "engine/consensus",
        "engine/providers",
        "engine/schemas",
        "engine/utils",
        "configs"
    ]

    for d in dirs:
        os.makedirs(d, exist_ok=True)
        if "notebook" not in d and "configs" not in d:
            with open(os.path.join(d, "__init__.py"), "w", encoding="utf-8") as f:
                pass

    # Phase A0 Files
    with open("requirements.txt", "w", encoding="utf-8") as f:
        f.write("""PyMuPDF
pdfplumber
paddlepaddle
paddleocr
pandas
openpyxl
python-docx
camelot-py[cv]
tabula-py
pydantic
requests
openai
jupyter
""")

    with open(".env.example", "w", encoding="utf-8") as f:
        f.write("""OPENAI_API_KEY=your_openai_api_key_here
OLLAMA_BASE_URL=http://localhostXX:5XXX/api/chat
""")

    # Dummy notebooks
    notebooks = [
        "00_environment_setup.ipynb",
        "01_knowledge_base_validation.ipynb",
        "02_document_extraction_test.ipynb",
        "03_evidence_aggregation_test.ipynb",
        "04_validator_test.ipynb",
        "05_scoring_agent_test.ipynb",
        "06_consensus_test.ipynb",
        "07_end_to_end_test.ipynb"
    ]
    empty_nb = {"cells": [], "metadata": {}, "nbformat": 4, "nbformat_minor": 5}
    for nb in notebooks:
        with open(os.path.join("notebook", nb), "w", encoding="utf-8") as f:
            json.dump(empty_nb, f)

    # Config
    with open("configs/model_config.json", "w", encoding="utf-8") as f:
        json.dump({
            "active_provider": "openai",
            "providers": {
                "openai": {
                    "model": "gpt-5-mini"
                },
                "ollama": {
                    "model": "qwen3:32b",
                    "base_url": "http://localhostXX:5XXX/api/chat",
                    "temperature": 0.0
                }
            }
        }, f, indent=4)
        
    print("Scaffolding complete.")

if __name__ == "__main__":
    scaffold()
