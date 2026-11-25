# CSMS AI Marine Scoring Engine — Testing Notebooks

Complete end-to-end testing and evaluation suite for the CSMS AI Marine scoring engine.

## Overview

This folder contains notebooks that test and enhance the CSMS AI scoring pipeline across all 29 marine categories. The pipeline scores contractor safety management systems using a 6-stage process:

1. **Extraction** — Extract text from documents (PDF, Word, Excel, Images)
2. **Aggregation** — Chunk, embed, and retrieve relevant evidence using semantic search
3. **Validation** — Run rule-based validators (dates, signatures, keywords, completeness)
4. **Juror Scoring** — Three independent AI jurors evaluate compliance (0/3/6/10 scale)
5. **Consensus** — Equal-weighted synthesis of juror scores
6. **Recommendation** — Final score compared against expected benchmark

## Notebooks

### 01_full_pipeline_with_embeddings.ipynb

**Single-category deep dive with embedding enhancement**

Tests the complete pipeline on one category (default: 3.5) with detailed output at each stage.

**Features:**
- Complete pipeline execution with verbose logging
- Chunking strategy (512 chars, 50 char overlap)
- Embedding with OpenAI models (small/large)
- SQLite vector store with FTS5 full-text search
- Hybrid semantic + keyword retrieval (Reciprocal Rank Fusion)
- Comparison: original flat aggregation vs enhanced semantic aggregation
- Side-by-side accuracy comparison

**Use case:** Debug and optimize pipeline for a specific category before batch testing.

**Configuration:**
```python
TARGET_CATEGORY = '3.5'  # Change to test any category
EMBEDDING_MODEL = 'text-embedding-3-small'  # or 'text-embedding-3-large'
CHUNK_SIZE = 512
CHUNK_OVERLAP = 50
TOP_K = 15  # Number of relevant chunks to retrieve
```

**Outputs:**
- Detailed console output for each pipeline stage
- SQLite database: `outputs/evidence_store.db`
- Intermediate JSON logs in `logs/` folder

---

### 02_batch_evaluation_all_categories.ipynb

**Batch testing across all 29 marine categories**

Runs three pipeline variants in parallel:
1. **Original Pipeline** — Flat aggregation (no embeddings)
2. **Enhanced (Small)** — text-embedding-3-small (1536-dim)
3. **Enhanced (Large)** — text-embedding-3-large (3072-dim)

**Features:**
- Automatic category discovery from `test_submissions/marine/`
- Expected score loading from `expected_result.json` files
- Parallel execution with progress bars
- Intermediate result saving (every 5 categories)
- Comprehensive accuracy metrics
- HTML dashboard generation with progress bars
- CSV export for further analysis

**Configuration:**
```python
RUN_ORIGINAL_PIPELINE = True
RUN_ENHANCED_SMALL = True
RUN_ENHANCED_LARGE = False  # Set to True to compare models
PARALLEL_CATEGORIES = 3  # Number of parallel workers
SAVE_INTERMEDIATE_RESULTS = True
```

**Outputs:**
- `outputs/reports/batch_evaluation_results.json` — Complete structured results
- `outputs/reports/batch_evaluation_results.csv` — Tabular summary
- `outputs/reports/batch_evaluation_dashboard.html` — Interactive dashboard
- Individual SQLite databases per category in `outputs/databases/`

**Expected runtime:** 15-25 minutes for all 29 categories (depends on API latency)

---

## Architecture

### Pipeline Stages

```
┌─────────────────┐
│   Extraction    │  ExtractorRouter → PDF/OCR/Excel/Word/Vision
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Aggregation   │  Chunk → Embed → Store → Retrieve (Enhanced)
└────────┬────────┘  or Flat Concat (Original)
         │
         ▼
┌─────────────────┐
│   Validation    │  ValidatorEngine (8 validators)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Juror Scoring  │  Compliance + Evidence + HSE (3 jurors)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Consensus    │  Equal-weighted synthesis
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Recommendation │  snap_to_csms_scale vs expected
└─────────────────┘
```

### Enhancement: Semantic Aggregation

**Original Pipeline:**
- Concatenates all extracted evidence into one string
- Truncates at 80K chars
- Feeds entire blob to LLM for summarization
- **Problem:** Wastes tokens, loses semantic signal

**Enhanced Pipeline:**
- **Chunk:** Break evidence into 512-char windows (50-char overlap)
- **Embed:** Generate 1536-dim vectors using OpenAI embeddings
- **Store:** Save chunks + embeddings in SQLite with FTS5 index
- **Retrieve:** Query using category scoring rules → hybrid search
- **Aggregate:** Feed only top-K relevant chunks to LLM
- **Benefit:** 90% token reduction, better semantic relevance

### Scoring Scale

CSMS uses discrete scale: **0, 3, 6, 10**

```python
def snap_to_csms_scale(val):
    if val < 1.5: return 0
    if val < 4.5: return 3
    if val < 8.0: return 6
    return 10
```

## Test Data

### Structure

```
test_submissions/marine/
├── 1 Kepemimpinan dan Komitmen/
│   ├── expected_result.json
│   ├── document1.pdf
│   └── document2.docx
├── 2 Kebijakan dan Sasaran Strategis K3LL/
│   └── ...
└── 8.2 Ciri-ciri Tambahan Sistem Pengelolaan K3LL/
    └── ...
```

### Expected Results

Each category folder contains `expected_result.json`:

```json
{
  "category_id": "3.5",
  "expected_score": 10,
  "notes": "Auto-generated expected result"
}
```

**Category distribution:**
- **Expected 10:** 27 categories (full compliance)
- **Expected 6:** 1 category (4.1 - partial compliance)
- **Expected 0:** 1 category (6.5 - no evidence)

## Model Choices

### Embedding Models

| Model | Dimensions | Cost | Performance | Use Case |
|-------|-----------|------|-------------|----------|
| `text-embedding-3-small` | 1536 | $0.02/1M tokens | Good | Default, fast iteration |
| `text-embedding-3-large` | 3072 | $0.13/1M tokens | Better | Final evaluation, higher accuracy |

**Recommendation:** Use `small` for development, `large` for production.

### LLM Models

**Jurors & Consensus:** Qwen3.5:27b via VLLM
- Configured in `configs/model_roles.json`
- Role: `reasoning_model` and `consensus_model`

**Aggregation:** GPT-4o-mini (optional)
- Used in enhanced pipeline for summarizing retrieved chunks
- Faster and cheaper than full jurors

## Usage

### Prerequisites

1. **Environment:**
   ```bash
   cd apps/backend/phe-view-hse/backend/csms-ai
   conda activate phe-hse
   ```

2. **API Keys:**
   ```bash
   export OPENAI_API_KEY="your-key-here"
   ```

3. **VLLM Server:**
   ```bash
   # Ensure VLLM is running on configured endpoint
   # Default: http://<HOST_LLM>:8000/v1
   ```

### Running Notebooks

**Option 1: Jupyter Notebook**
```bash
cd notebook_v2
jupyter notebook
# Open 01_full_pipeline_with_embeddings.ipynb or 02_batch_evaluation_all_categories.ipynb
```

**Option 2: VS Code**
- Open notebook file directly in VS Code
- Select Python interpreter (conda phe-hse)
- Run all cells

### Generating Dashboard

After batch evaluation completes:

```bash
cd notebook_v2
python generate_dashboard.py
```

Or regenerate from existing JSON:

```bash
python generate_dashboard.py outputs/reports/batch_evaluation_results.json outputs/reports/batch_evaluation_dashboard.html
```

Open `outputs/reports/batch_evaluation_dashboard.html` in browser.

## Dashboard Features

The HTML dashboard provides:

1. **Summary Cards**
   - Total categories evaluated
   - Accuracy per pipeline variant
   - Total processing time

2. **Results Table**
   - Category ID and name
   - Expected score
   - Predicted scores (3 pipelines)
   - Progress bars showing score/10
   - Correct/Wrong badges
   - Best match identification

3. **Progress Bars**
   - Visual representation of predicted vs expected
   - Color coding: green (correct), yellow (partial), red (wrong)

4. **Metrics**
   - Confidence scores
   - Processing time per category
   - Chunk statistics (enhanced pipelines)

## Configuration Files

### configs/model_roles.json

```json
{
  "reasoning_model": {
    "provider": "vllm",
    "model": "qwen3.5:27b",
    "base_url": "http://<HOST_LLM>:8000/v1"
  },
  "consensus_model": {
    "provider": "vllm",
    "model": "qwen3.5:27b",
    "base_url": "http://<HOST_LLM>:8000/v1"
  }
}
```

### configs/model_config.json

```json
{
  "embedding_model": "text-embedding-3-small",
  "chunk_size": 512,
  "chunk_overlap": 50,
  "top_k": 15
}
```

## Troubleshooting

### VLLM Connection Failed

**Error:** `ConnectionError: Failed to connect to VLLM server`

**Solution:**
```bash
# Check if VLLM is running
curl http://<HOST_LLM>:8000/v1/models

# If not running, start VLLM server
# See: server/README.md
```

### OpenAI API Key Missing

**Error:** `AuthenticationError: No API key provided`

**Solution:**
```bash
export OPENAI_API_KEY="sk-..."
# Or add to ~/.bashrc
```

### SQLite Database Locked

**Error:** `sqlite3.OperationalError: database is locked`

**Solution:**
- Close any other processes using the database
- Delete database and re-run: `rm outputs/databases/*.db`
- Check for zombie processes: `lsof | grep sqlite`

### Out of Memory

**Error:** `MemoryError` or `OOM Killed`

**Solution:**
- Reduce `PARALLEL_CATEGORIES` to 1
- Reduce `TOP_K` to 10
- Process categories in smaller batches
- Increase swap space

## Performance Tips

1. **Parallel Execution:**
   - Set `PARALLEL_CATEGORIES = 3` for 3x speedup
   - Requires sufficient RAM (8GB+ recommended)

2. **Embedding Caching:**
   - Notebooks automatically skip re-embedding if chunks unchanged
   - Database files persist across runs

3. **Selective Testing:**
   - Test single category first (notebook 01)
   - Run batch on subset: modify category discovery logic
   - Use `SAVE_INTERMEDIATE_RESULTS` for long runs

4. **Model Selection:**
   - Use `text-embedding-3-small` for development (10x cheaper)
   - Use `text-embedding-3-large` for final evaluation (better accuracy)

## File Structure

```
notebook_v2/
├── README.md                                    # This file
├── 01_full_pipeline_with_embeddings.ipynb       # Single-category test
├── 02_batch_evaluation_all_categories.ipynb     # Batch test (29 categories)
├── generate_dashboard.py                        # Dashboard generator script
├── outputs/
│   ├── evidence_store.db                        # SQLite database (notebook 01)
│   ├── databases/                               # Per-category databases (notebook 02)
│   │   ├── cat_1_small.db
│   │   ├── cat_2_small.db
│   │   └── ...
│   └── reports/
│       ├── batch_evaluation_results.json        # Structured results
│       ├── batch_evaluation_results.csv         # Tabular summary
│       └── batch_evaluation_dashboard.html      # Interactive dashboard
└── logs/                                        # Pipeline execution logs
```

## Related Files

- `engine/pipeline.py` — Main pipeline implementation
- `engine/aggregators/evidence_aggregator.py` — Aggregation logic
- `engine/jurors/*.py` — Juror implementations
- `engine/consensus/consensus_agent.py` — Consensus logic
- `configs/` — Configuration files
- `knowledge_base/marine/` — Category definitions and scoring rules

## Next Steps

1. **Run notebook 01** to understand pipeline on single category
2. **Run notebook 02** to evaluate all categories
3. **Review dashboard** to identify problematic categories
4. **Tune parameters** (chunk size, top_k, embedding model)
5. **Analyze failures** by examining logs and extracted evidence
6. **Iterate** on aggregation and retrieval strategies

## Support

For issues or questions:
- Check logs in `logs/` folder
- Review pipeline code in `engine/`
- Examine knowledge base in `knowledge_base/marine/`
- See main README: `../../readme.md`
