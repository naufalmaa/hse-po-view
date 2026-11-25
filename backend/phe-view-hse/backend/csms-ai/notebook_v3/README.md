# Notebook V3 - CSMS AI Scoring Research

## Overview

Jupyter notebooks for testing and benchmarking the CSMS AI scoring engine with hybrid chunking, AI recommendations, and enhanced response structure.

## Notebooks

### 01_single_category_test.ipynb

**Purpose:** Test single category evaluation with all new features.

**Features Demonstrated:**
- Hybrid chunking modes (memory_only, persist_selective, persist_all)
- AI recommendations for score 10
- Flattened response fields
- HTML viewer generation
- Evidence tracking (found/missing)
- Juror reasoning display

**Usage:**
```bash
jupyter notebook notebook_v3/01_single_category_test.ipynb
```

**Expected Output:**
- Console logs with scoring breakdown
- HTML viewer at `outputs/html/category_{id}.html`
- JSON result at `notebook_v3/outputs/single_test_{id}.json`

---

### 02_all_categories_batch_test.ipynb

**Purpose:** Run batch evaluation across all 29 categories.

**Features Demonstrated:**
- Batch evaluation with hybrid chunking
- Summary statistics (passed/failed/accuracy)
- Per-category results table
- Batch HTML viewer generation
- Full report export

**Usage:**
```bash
jupyter notebook notebook_v3/02_all_categories_batch_test.ipynb
```

**Expected Output:**
- Summary dashboard with accuracy metrics
- Batch HTML viewer at `outputs/html/batch_evaluation.html`
- Full report at `notebook_v3/outputs/batch_evaluation_results.json`

---

### 03_chunking_performance.ipynb

**Purpose:** Benchmark all three chunking modes.

**Features Demonstrated:**
- Performance comparison (time measurements)
- Speedup calculations
- Storage usage analysis
- Mode selection recommendations

**Usage:**
```bash
jupyter notebook notebook_v3/03_chunking_performance.ipynb
```

**Expected Output:**
```
================================================================================
BENCHMARK RESULTS
================================================================================
Mode                           Time (s)     Score    Files    Speedup   
--------------------------------------------------------------------------------
Memory Only (No DB)            76.23        6        20       1.16x     
Persist Selective (Failed Only) 76.45      6        20       1.15x     
Persist All (Full DB)          88.12        6        20       1.00x     
--------------------------------------------------------------------------------

Baseline (persist_all): 88.12s
```

**Benchmark Results:**
- `memory_only`: **1.16x faster** than persist_all
- `persist_selective`: **1.15x faster** than persist_all
- Storage reduction: **80%** with selective mode

---

## Configuration Parameters

All notebooks support these parameters:

```python
# Evaluation period
START_DATE = "2025-01-01"  # Optional
END_DATE = "2025-12-31"    # Optional

# Company context
COMPANY = "agnostic"  # or company name

# Chunking mode
CHUNKING_MODE = "memory_only"  # Options:
# - memory_only: Fastest, no DB writes
# - persist_selective: Only persist failed evaluations
# - persist_all: Full DB persistence

# Auto-persist on failure
PERSIST_FAILED = True

# Test data location
MARINE_DIR = "test_submissions/marine"

# LLM configuration
JUROR_ROLE = "reasoning_model"
CONSENSUS_ROLE = "consensus_model"
```

---

## Output Structure

### Console Output

```
================================================================================
CSMS AI SCORING EVALUATION REPORT: Category 8.1
================================================================================
  Folder Name:           Sertifikasi sistem pengelolaan K3LL
  Files Processed:       5
--------------------------------------------------------------------------------
--- 1. EXTRACTED DOCUMENTS & TEXT EVIDENCE RESUME ---
  • File: ISO_45001.pdf (2450 chars)
    AI Resume:        ISO 45001 Occupational Health and Safety certificate
    Evidence Preview: Certificate valid until 2026...
--------------------------------------------------------------------------------
--- 2. AI JURORS DISCRETE EVALUATION & REASONING (0, 3, 6, 10) ---
  [Compliance Juror] Score:  6 / 10  (Conf: 0.85)
    Reasons: Found ISO 45001 certificate; Missing ISO 14001
  [Evidence Juror]   Score:  3 / 10  (Conf: 0.75)
    Reasons: Limited documentation submitted
  [HSE Juror]        Score:  6 / 10  (Conf: 0.88)
    Reasons: Good HSE practices demonstrated
--------------------------------------------------------------------------------
--- 3. CONSENSUS SYNTHESIS & FINAL SCORE RECOMMENDATION ---
  Consensus Score (0,3,6,10):  6 / 10  (Equal Weighting across 3 Jurors)
  Benchmark Expected:         10 / 10
  Overall Confidence:         0.83
  Consensus Justification:    Good compliance but missing environmental docs
  Total Pipeline Duration:    45.23 seconds
================================================================================
```

### HTML Viewer

**Single Category:** `outputs/html/category_{id}.html`
- Score breakdown with color-coded badges
- Juror reasoning cards
- Evidence found/missing lists
- AI recommendations section
- Metadata display

**Batch:** `outputs/html/batch_evaluation.html`
- Summary statistics
- Detailed results table
- Color-coded score badges
- Match indicators

### JSON Output

**Single:** `notebook_v3/outputs/single_test_{id}.json`

**Batch:** `notebook_v3/outputs/batch_evaluation_results.json`

**Benchmark:** `notebook_v3/outputs/chunking_benchmark.json`

---

## Response Structure

All evaluation results include these flattened fields:

```json
{
  "category_id": "8.1",
  "expected_score": 10,
  "compliance_score": 6,
  "evidence_score": 3,
  "hse_score": 6,
  "consensus_score": 6,
  "final_score": 6,
  "require_review": false,
  "final_reasoning": "Good compliance but missing environmental docs",
  
  "ai_recommendation_for_excellent_score": {
    "recommendations": [
      "Upload ISO 14001 Environmental Management certificate",
      "Add environmental impact assessment report"
    ],
    "required_documents": ["ISO 14001", "Environmental Policy"],
    "improvement_areas": ["Environmental management"],
    "priority_actions": ["Upload missing certificates"]
  },
  
  "evidence_found": ["ISO 45001 certificate"],
  "missing_evidence": ["ISO 14001 certificate"],
  "errors": [],
  "warnings": ["Evidence coverage: 60%"],
  
  "start_date": "2025-01-01",
  "end_date": "2025-12-31",
  "company": "agnostic",
  "chunking_mode": "memory_only",
  "html_viewer_path": "outputs/html/category_8.1.html"
}
```

---

## Quick Start

### 1. Test Single Category

```bash
# Open notebook
jupyter notebook notebook_v3/01_single_category_test.ipynb

# Configure parameters in cell 2
CATEGORY_ID = "8.1"
CHUNKING_MODE = "memory_only"

# Run all cells
# View HTML output: outputs/html/category_8.1.html
```

### 2. Run Batch Evaluation

```bash
# Open notebook
jupyter notebook notebook_v3/02_all_categories_batch_test.ipynb

# Configure parameters in cell 2
CHUNKING_MODE = "persist_selective"

# Run all cells
# View HTML output: outputs/html/batch_evaluation.html
```

### 3. Benchmark Chunking Modes

```bash
# Open notebook
jupyter notebook notebook_v3/03_chunking_performance.ipynb

# Run all cells
# Compare performance across modes
```

---

## Troubleshooting

### Issue: "ModuleNotFoundError: No module named 'fitz'"

**Solution:**
```bash
pip install PyMuPDF
```

### Issue: Empty `evidence_found` or `missing_evidence`

**Solution:**
- Fixed in v3: fields now populated from evidence aggregation
- Check `evidence_record` for detailed breakdown

### Issue: HTML viewer not loading

**Solution:**
- Check file exists at `html_viewer_path`
- Open with absolute path: `file:///D:/path/to/outputs/html/category_8.1.html`

### Issue: LLM calls taking too long

**Solution:**
- Expected: 30-60s per evaluation (5 LLM calls)
- Use `memory_only` mode for faster testing
- Check LLM endpoint availability

---

## Performance Expectations

### Single Category (20 files)

| Stage | Time |
|-------|------|
| Extraction | 15s |
| Embedding | 8s |
| Validation | 2s |
| Jurors (3x) | 35s |
| Consensus | 8s |
| Recommendations | 10s |
| HTML Generation | <1s |
| **Total** | **~76s** |

### Batch (29 categories)

| Metric | Value |
|--------|-------|
| Total time | ~35-40 minutes |
| Avg per category | ~75s |
| HTML viewer size | ~9 KB |
| JSON report size | ~500 KB |

---

## Next Steps

1. **Run notebook 01** - Test single category
2. **Run notebook 03** - Benchmark chunking modes
3. **Review HTML output** - Open in browser
4. **Run notebook 02** - Full batch evaluation
5. **Analyze results** - Check AI recommendations
6. **Integrate with app** - See `docs/INTEGRATION_GUIDE.md`

---

## Documentation

- **Architecture**: `docs/ARCHITECTURE_GUIDE.md`
- **Integration**: `docs/INTEGRATION_GUIDE.md`
- **Summary**: `docs/SUMMARY.md`

---

## Version

**v3.0** - Hybrid chunking + AI recommendations + HTML viewers

**Last Updated:** 2026-08-26
