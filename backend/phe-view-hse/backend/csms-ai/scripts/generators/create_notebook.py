import json

cells = [
    {
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "# End-to-End Local AI Scoring Engine Test\\n",
            "\\n",
            "This notebook tests the entire pipeline for Category **3.5** across different expected score levels (0, 3, 6, 10)."
        ]
    },
    {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "import os\\n",
            "import sys\\n",
            "import json\\n",
            "\\n",
            "# Add the parent directory to sys.path so we can import the engine\\n",
            "sys.path.append(os.path.abspath('..'))\\n",
            "\\n",
            "from engine.pipeline import score_category\\n",
            "from dotenv import load_dotenv\\n",
            "\\n",
            "# Load API keys\\n",
            "load_dotenv('../.env')"
        ]
    },
    {
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## Define Test Cases\\n",
            "We will iterate through the `test_submissions/marine/3.5` subdirectories."
        ]
    },
    {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "base_test_dir = os.path.abspath('../test_submissions/marine/3.5')\\n",
            "test_cases = ['score_0', 'score_3', 'score_6', 'score_10']\\n",
            "\\n",
            "def load_expected_result(folder_path):\\n",
            "    expected_file = os.path.join(folder_path, 'expected_result.json')\\n",
            "    if os.path.exists(expected_file) and os.path.getsize(expected_file) > 0:\\n",
            "        try:\\n",
            "            with open(expected_file, 'r') as f:\\n",
            "                return json.load(f)\\n",
            "        except json.JSONDecodeError:\\n",
            "            pass\\n",
            "    return None"
        ]
    },
    {
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## Execute Pipeline"
        ]
    },
    {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "results = {}\\n",
            "\\n",
            "for case in test_cases:\\n",
            "    folder_path = os.path.join(base_test_dir, case)\\n",
            "    if not os.path.exists(folder_path):\\n",
            "        print(f'Warning: Test folder {folder_path} does not exist. Skipping.')\\n",
            "        continue\\n",
            "        \\n",
            "    print(f'\\\\n{'='*50}')\\n",
            "    print(f'Running Test Case: {case}')\\n",
            "    print(f'{'='*50}')\\n",
            "    \\n",
            "    expected = load_expected_result(folder_path)\\n",
            "    print(f'Expected Result: {json.dumps(expected, indent=2)}')\\n",
            "    \\n",
            "    try:\\n",
            "        # Execute the pipeline\\n",
            "        actual = score_category('3.5', folder_path)\\n",
            "        results[case] = {\\n",
            "            'expected': expected,\\n",
            "            'actual': actual\\n",
            "        }\\n",
            "        \\n",
            "        print('\\\\n--- ACTUAL OUTPUT ---')\\n",
            "        print(json.dumps(actual, indent=2))\\n",
            "        \\n",
            "        # Simple assertion check\\n",
            "        if expected and 'expected_score' in expected:\\n",
            "            if expected['expected_score'] == actual.get('recommended_score'):\\n",
            "                print('\\\\n✅ TEST PASSED: Score matches expected.')\\n",
            "            else:\\n",
            "                print('\\\\n❌ TEST FAILED: Score mismatch.')\\n",
            "                \\n",
            "    except Exception as e:\\n",
            "        print(f'\\\\n⚠️ PIPELINE ERROR: {e}')"
        ]
    },
    {
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## Summary"
        ]
    },
    {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "print('Test Execution Summary:')\\n",
            "for case, res in results.items():\\n",
            "    expected_score = res['expected'].get('expected_score') if res['expected'] else 'N/A'\\n",
            "    actual_score = res['actual'].get('recommended_score', 'Error')\\n",
            "    match = '✅' if expected_score == actual_score else '❌'\\n",
            "    print(f'{case}: Expected {expected_score} | Actual {actual_score} {match}')"
        ]
    }
]

notebook = {
    "cells": cells,
    "metadata": {
        "language_info": {
            "name": "python"
        }
    },
    "nbformat": 4,
    "nbformat_minor": 5
}

with open("notebook/07_end_to_end_test.ipynb", "w", encoding="utf-8") as f:
    json.dump(notebook, f, indent=2)

print("Notebook 07 created successfully.")
