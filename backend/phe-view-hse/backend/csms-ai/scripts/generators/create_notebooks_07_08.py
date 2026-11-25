import json
import os

def create_07():
    cells = [
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "# 07 - End-to-End Local AI Scoring Engine Test (Default/OpenAI Provider)\n",
                "\n",
                "This notebook runs the automated evaluation across Marine CSMS category submissions, testing Category 3.5 first before running the full batch evaluation and exporting comprehensive Excel and HTML reports."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "import os\n",
                "import sys\n",
                "import json\n",
                "import pandas as pd\n",
                "\n",
                "sys.path.append(os.path.abspath('..'))\n",
                "from dotenv import load_dotenv\n",
                "load_dotenv('../.env')\n",
                "\n",
                "from engine.pipeline import evaluate_all_categories, discover_category_folders, score_category\n",
                "\n",
                "# Configure sys.stdout for utf-8 if possible\n",
                "if hasattr(sys.stdout, 'reconfigure'):\n",
                "    sys.stdout.reconfigure(encoding='utf-8', errors='replace')"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## Step 1 & 2: Discover Category Folders"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "marine_dir = os.path.abspath('../test_submissions/marine')\n",
                "discovered = discover_category_folders(marine_dir)\n",
                "print(f'Discovered {len(discovered)} category folders in {marine_dir}:')\n",
                "for d in discovered:\n",
                "    print(f' - Category {d[\"category_id\"]}: {d[\"folder_name\"]}')"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## Step 3: Test Category 3.5 End-to-End First"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "# Test Category 3.5 end-to-end specifically as requested\n",
                "cat_35_folders = [d for d in discovered if d['category_id'] == '3.5']\n",
                "print(f'Found {len(cat_35_folders)} folder(s) for Category 3.5:')\n",
                "for d in cat_35_folders:\n",
                "    print(f'\\n========================================================')\n",
                "    print(f'Testing Category 3.5: {d[\"folder_name\"]}')\n",
                "    print(f'========================================================')\n",
                "    res = score_category(d['category_id'], d['folder_path'], silent=False)\n",
                "    print('\\nResult Summary:')\n",
                "    print(json.dumps({\n",
                "        'category_id': res.get('category_id'),\n",
                "        'folder_name': res.get('folder_name'),\n",
                "        'expected_score': res.get('expected_score'),\n",
                "        'predicted_score': res.get('predicted_score'),\n",
                "        'confidence': res.get('confidence'),\n",
                "        'status': res.get('status'),\n",
                "        'evidence_count': res.get('evidence_count'),\n",
                "        'processing_time_sec': res.get('processing_time_sec')\n",
                "    }, indent=2))"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## Step 4: Evaluate All Categories & Generate Excel / HTML Reports"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "# This runs the pipeline for all categories, logs results, and automatically writes JSON, CSV, Excel (.xlsx), and HTML Viewer\n",
                "report = evaluate_all_categories(marine_dir)\n",
                "\n",
                "print('\\nSummary KPI Metrics:')\n",
                "print(f'Total Categories : {report.get(\"total_categories\", 0)}')\n",
                "print(f'Passed (Correct) : {report.get(\"passed\", 0)}')\n",
                "print(f'Needs Review     : {report.get(\"needs_review\", 0)}')\n",
                "print(f'Failed / Mismatch: {report.get(\"failed\", 0)}')\n",
                "print(f'Accuracy         : {report.get(\"accuracy\", 0.0)}%')"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## Step 5: View Results Table & Comprehensive Report Links"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "# Display as pandas DataFrame\n",
                "if report.get('results'):\n",
                "    df = pd.DataFrame(report['results'])\n",
                "    display(df[['category_id', 'folder_name', 'expected_score', 'predicted_score', 'confidence', 'status', 'evidence_count', 'processing_time_sec']])\n",
                "\n",
                "excel_path = os.path.abspath('../outputs/reports/evaluation_report.xlsx')\n",
                "csv_path = os.path.abspath('../outputs/reports/evaluation_report.csv')\n",
                "viewer_path = os.path.abspath('../viewer/index.html')\n",
                "\n",
                "print(f'\\n[EXCEL REPORT] Comprehensive report exported to:\\nfile:///{excel_path.replace(os.sep, \"/\")}')\n",
                "print(f'\\n[CSV REPORT] CSV report exported to:\\nfile:///{csv_path.replace(os.sep, \"/\")}')\n",
                "print(f'\\n[VIEWER] Interactive HTML Viewer is ready at:\\nfile:///{viewer_path.replace(os.sep, \"/\")}')\n",
                "print('You can open the HTML file directly in any browser or open the Excel report for offline analysis!')"
            ]
        }
    ]
    
    nb = {
        "cells": cells,
        "metadata": {
            "kernelspec": {
                "display_name": "Python 3",
                "language": "python",
                "name": "python3"
            },
            "language_info": {
                "name": "python",
                "version": "3.10.0"
            }
        },
        "nbformat": 4,
        "nbformat_minor": 5
    }
    
    os.makedirs("notebook", exist_ok=True)
    with open("notebook/07_end_to_end_test.ipynb", "w", encoding="utf-8") as f:
        json.dump(nb, f, indent=2)
    print("Created notebook/07_end_to_end_test.ipynb")

def create_08():
    cells = [
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "# 08 - End-to-End Remote Ollama AI Scoring Engine Test\n",
                "\n",
                "This notebook allows you to configure your remote Ollama server settings (URL, model name, etc.) and run automated AI scoring across Marine CSMS submissions with comprehensive Excel export."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "import os\n",
                "import sys\n",
                "import json\n",
                "import pandas as pd\n",
                "import requests\n",
                "import time\n",
                "\n",
                "sys.path.append(os.path.abspath('..'))\n",
                "\n",
                "# Configure remote Ollama Server settings dynamically based on your environment\n",
                "config_path = os.path.abspath('../configs/model_config.json')\n",
                "if os.path.exists(config_path):\n",
                "    with open(config_path, 'r', encoding='utf-8') as f:\n",
                "        config = json.load(f)\n",
                "    config['active_provider'] = 'ollama'\n",
                "    \n",
                "    # CUSTOMIZE YOUR OLLAMA SETTINGS BELOW:\n",
                "    curr_url = config['providers']['ollama'].get('base_url', 'http://localhost:11434/api/chat')\n",
                "    if not curr_url.rstrip('/').endswith('/api/chat'):\n",
                "        curr_url = curr_url.rstrip('/') + '/api/chat'\n",
                "    config['providers']['ollama']['base_url'] = curr_url\n",
                "    config['providers']['ollama']['model'] = config['providers']['ollama'].get('model', 'qwen3.5:27b')\n",
                "    config['providers']['ollama']['temperature'] = config['providers']['ollama'].get('temperature', 0.0)\n",
                "    \n",
                "    with open(config_path, 'w', encoding='utf-8') as f:\n",
                "        json.dump(config, f, indent=4)\n",
                "    print(f'[CONFIG] Active provider set to: {config[\"active_provider\"]}')\n",
                "    print(f'[CONFIG] Ollama Server URL: {config[\"providers\"][\"ollama\"][\"base_url\"]}')\n",
                "    print(f'[CONFIG] Ollama Model: {config[\"providers\"][\"ollama\"][\"model\"]}')\n",
                "\n",
                "from engine.pipeline import evaluate_all_categories, discover_category_folders, score_category\n",
                "\n",
                "if hasattr(sys.stdout, 'reconfigure'):\n",
                "    sys.stdout.reconfigure(encoding='utf-8', errors='replace')"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## Step 1: Verify Direct Connection to Remote Ollama Server (/api/chat)\n",
                "\n",
                "This step performs a direct test request to your configured Ollama server using the standard `/api/chat` POST payload format to ensure the endpoint and model are responding correctly."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "import requests\n",
                "import json\n",
                "import time\n",
                "\n",
                "target_url = config['providers']['ollama']['base_url']\n",
                "\n",
                "payload = {\n",
                "    'model': config['providers']['ollama']['model'],\n",
                "    'options': {\n",
                "        'temperature': config['providers']['ollama'].get('temperature', 0.0)\n",
                "    },\n",
                "    'stream': False,\n",
                "    'messages': [\n",
                "        {\n",
                "            'role': 'system',\n",
                "            'content': 'You are an advanced javascript programmer'\n",
                "        },\n",
                "        {\n",
                "            'role': 'user',\n",
                "            'content': 'create simple fastify hello world, '\n",
                "        }\n",
                "    ]\n",
                "}\n",
                "\n",
                "print(f'POST {target_url}\\n')\n",
                "print(json.dumps(payload, indent=4))\n",
                "print('\\nSending test request to remote Ollama server...')\n",
                "\n",
                "try:\n",
                "    start_time = time.time()\n",
                "    response = requests.post(target_url, json=payload, timeout=60)\n",
                "    response.raise_for_status()\n",
                "    elapsed = round(time.time() - start_time, 2)\n",
                "    res_json = response.json()\n",
                "    print(f'\\n[SUCCESS] Received response in {elapsed}s:\\n')\n",
                "    print(json.dumps(res_json, indent=4))\n",
                "except Exception as e:\n",
                "    print(f'\\n[ERROR] Could not connect to remote Ollama Server at {target_url}: {e}')\n",
                "    print('Please check that your Ollama server is running and accessible over the network.')"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## Step 2 & 3: Discover Category Folders"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "marine_dir = os.path.abspath('../test_submissions/marine')\n",
                "discovered = discover_category_folders(marine_dir)\n",
                "print(f'Discovered {len(discovered)} category folders in {marine_dir}:')\n",
                "for d in discovered:\n",
                "    print(f' - Category {d[\"category_id\"]}: {d[\"folder_name\"]}')"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## Step 4: Test Category 3.5 End-to-End via Ollama Provider"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "# Test Category 3.5 specifically using Ollama model\n",
                "cat_35_folders = [d for d in discovered if d['category_id'] == '3.5']\n",
                "print(f'Found {len(cat_35_folders)} folder(s) for Category 3.5:')\n",
                "for d in cat_35_folders:\n",
                "    print(f'\\n========================================================')\n",
                "    print(f'Testing Category 3.5 (Ollama): {d[\"folder_name\"]}')\n",
                "    print(f'========================================================')\n",
                "    res = score_category(d['category_id'], d['folder_path'], silent=False)\n",
                "    print('\\nResult Summary:')\n",
                "    print(json.dumps({\n",
                "        'category_id': res.get('category_id'),\n",
                "        'folder_name': res.get('folder_name'),\n",
                "        'expected_score': res.get('expected_score'),\n",
                "        'predicted_score': res.get('predicted_score'),\n",
                "        'confidence': res.get('confidence'),\n",
                "        'status': res.get('status'),\n",
                "        'evidence_count': res.get('evidence_count'),\n",
                "        'processing_time_sec': res.get('processing_time_sec')\n",
                "    }, indent=2))"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## Step 5: Evaluate All Categories via Ollama Provider"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "# This runs the pipeline for all categories using Ollama, logs results, and automatically writes JSON, CSV, Excel (.xlsx), and HTML Viewer\n",
                "report = evaluate_all_categories(marine_dir)\n",
                "\n",
                "print('\\nSummary KPI Metrics:')\n",
                "print(f'Total Categories : {report.get(\"total_categories\", 0)}')\n",
                "print(f'Passed (Correct) : {report.get(\"passed\", 0)}')\n",
                "print(f'Needs Review     : {report.get(\"needs_review\", 0)}')\n",
                "print(f'Failed / Mismatch: {report.get(\"failed\", 0)}')\n",
                "print(f'Accuracy         : {report.get(\"accuracy\", 0.0)}%')"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## Step 6: View Results Table & Comprehensive Report Links"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "if report.get('results'):\n",
                "    df = pd.DataFrame(report['results'])\n",
                "    display(df[['category_id', 'folder_name', 'expected_score', 'predicted_score', 'confidence', 'status', 'evidence_count', 'processing_time_sec']])\n",
                "\n",
                "excel_path = os.path.abspath('../outputs/reports/evaluation_report.xlsx')\n",
                "csv_path = os.path.abspath('../outputs/reports/evaluation_report.csv')\n",
                "viewer_path = os.path.abspath('../viewer/index.html')\n",
                "\n",
                "print(f'\\n[EXCEL REPORT] Comprehensive report exported to:\\nfile:///{excel_path.replace(os.sep, \"/\")}')\n",
                "print(f'\\n[CSV REPORT] CSV report exported to:\\nfile:///{csv_path.replace(os.sep, \"/\")}')\n",
                "print(f'\\n[VIEWER] Interactive HTML Viewer is ready at:\\nfile:///{viewer_path.replace(os.sep, \"/\")}')\n",
                "print('You can open the HTML file directly in any browser or open the Excel report for offline analysis!')\n",
                "\n",
                "# Restore default provider to openai after test\n",
                "if os.path.exists(config_path):\n",
                "    with open(config_path, 'r', encoding='utf-8') as f:\n",
                "        config = json.load(f)\n",
                "    config['active_provider'] = 'openai'\n",
                "    with open(config_path, 'w', encoding='utf-8') as f:\n",
                "        json.dump(config, f, indent=4)\n",
                "    print('[CONFIG] Restored default provider to: openai')"
            ]
        }
    ]
    
    nb = {
        "cells": cells,
        "metadata": {
            "kernelspec": {
                "display_name": "Python 3",
                "language": "python",
                "name": "python3"
            },
            "language_info": {
                "name": "python",
                "version": "3.10.0"
            }
        },
        "nbformat": 4,
        "nbformat_minor": 5
    }
    
    os.makedirs("notebook", exist_ok=True)
    with open("notebook/08_ollama_server_test.ipynb", "w", encoding="utf-8") as f:
        json.dump(nb, f, indent=2)
    print("Created notebook/08_ollama_server_test.ipynb")

if __name__ == "__main__":
    create_07()
    create_08()
