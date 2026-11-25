# CSMS AI Scoring Engine - Architecture Guide

## Overview

The **CSMS AI Scoring Engine** evaluates contractor safety management systems (CSMS) using an ensemble multi-juror consensus architecture, hybrid evidence chunking, context-aware parameter ingestion, and hierarchical score aggregation.

```
                      ┌──────────────────────────────────────────────┐
                      │    Contractor Submission & Context Meta      │
                      │  - Folder Hierarchy (29 Subcategories)       │
                      │  - information.json (Company, Title, Dates)   │
                      └──────────────────────┬───────────────────────┘
                                             │
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │    Recursive Folder & Evidence Discovery     │
                      │  - Flexible Depth & File Ingestion           │
                      │  - PDF/Image OCR & Text Extraction           │
                      └──────────────────────┬───────────────────────┘
                                             │
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │    Hybrid Chunking & Evidence Store          │
                      │  - MEMORY_ONLY / PERSIST_SELECTIVE           │
                      └──────────────────────┬───────────────────────┘
                                             │
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │    Evidence Validation Engine (17 Rules)     │
                      └──────────────────────┬───────────────────────┘
                                             │
                       ┌─────────────────────┼─────────────────────┐
                       │ Context-Aware       │ Context-Aware       │ Context-Aware
                       ▼ Juror 1             ▼ Juror 2             ▼ Juror 3
                ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
                │  Compliance   │     │   Evidence    │     │      HSE      │
                │     Juror     │     │     Juror     │     │     Juror     │
                │  {0, 3, 6, 10}│     │  {0, 3, 6, 10}│     │  {0, 3, 6, 10}│
                └───────┬───────┘     └───────┬───────┘     └───────┬───────┘
                        │                     │                     │
                        └─────────────────────┼─────────────────────┘
                                              │
                                              ▼
                      ┌──────────────────────────────────────────────┐
                      │       Consensus Agent & Review Gate          │
                      │  - Equal-weighted Mean -> CSMS Discrete Snap │
                      │  - Discrepancy & Confidence Gating           │
                      └──────────────────────┬───────────────────────┘
                                             │
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │      AI Recommendation Engine (Score 10)     │
                      │  - Rule-Based Gap Analysis + LLM Refinement  │
                      └──────────────────────┬───────────────────────┘
                                             │
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │    Hierarchical Aggregation & HTML Viewer    │
                      │  - Parent Arithmetic Mean (Cat 1 to Cat 8)   │
                      │  - Interactive HTML Dashboard & Diagnostics  │
                      └──────────────────────────────────────────────┘
```

---

## Key Architectural Components

### 1. Context-Aware Evaluation & Company Meta Ingestion

The scoring engine ingests contractor metadata directly from `information.json` or through `EvaluationConfig.company_info`.

#### Context Schema (`information.json`)
```json
{
  "title": "Rental Crew Boat 60 Pax (NMS Accomplish) To Support PHE OSES 4710007645",
  "date_start": "2023-08-01",
  "date_end": "2027-01-27",
  "evaluation_date": "2026-01-22",
  "company": "PT Newport Marine Services",
  "category": "marine"
}
```

#### How Jurors Consume Company Context:
Each Juror (`ComplianceJuror`, `EvidenceJuror`, `HSEJuror`) and the `ConsensusAgent` injects this structured context into their prompt headers:
- **Contractor Validation:** Verifies that certificates, policies, and attendance lists belong to the specified company (not third parties or parent companies without delegation).
- **Timeline & Expiry Check:** Verifies document validity against the contract period (`date_start` to `date_end`) and evaluation date (`evaluation_date`). For example, policies older than 2 years without an annual review sheet are flagged.
- **Project Specificity:** Cross-references evidence with the specific project title/vessel name (e.g., *NMS Accomplish*).

---

### 2. Multi-Juror Ensemble & CSMS Scoring Rules

#### Discrete Scale Scoring Policy
CSMS strictly follows a 4-tier discrete scoring scale:
- **`0` (Non-Compliant / No Evidence):** Assigned **strictly and only** when a category folder contains **0 uploaded files**.
- **`3` (Partial Compliance / Basic Implementation):** Baseline minimum score when uploaded files exist, but mandatory documents (e.g. HSE Plan, Client Policy, Delegation of Authority) or formal audits are missing.
- **`6` (Substantial Compliance / Systematic Implementation):** Core required procedures and records are complete, valid, and systematically implemented.
- **`10` (Full Compliance / Excellent):** All mandatory documents, certifications (e.g. ISO 9001/14001/45001 where applicable), management reviews, and audit verification records are present and active.

> [!IMPORTANT]
> **Zero Score Enforcement:** If a category folder has 1 or more uploaded documents, the AI will never score 0; it awards a minimum of 3 (or higher) depending on evidence quality. If 0 files exist, it is instantly evaluated as 0 without LLM latency.

#### Juror Specialization:
1. **Compliance Juror:** Evaluates formal compliance against regulatory criteria, mandatory check numbers (`Check_01`, `Check_02`), certifications, and policy signatures.
2. **Evidence Juror:** Evaluates completeness, file validity, coverage percentage, date validity, and presence of mandatory attachments.
3. **HSE Juror:** Evaluates practical safety execution, field implementation records (MWT reports, tool-box meetings, drills, KPI tracking).
4. **Consensus Agent:** Synthesizes the 3 verdicts, calculates equal-weighted averages, snaps to `{0, 3, 6, 10}`, flags `requires_review = True` if juror score divergence $> 4$, and generates the final reasoning.

---

### 3. Hierarchical Category Structure & Mathematical Aggregation

The 29 marine categories follow a parent-child hierarchy:
- **Standalone Categories:** `1` (Leadership & Commitment), `2` (HSE Policy & Strategic Objectives).
- **Parent Categories with Subcategories:**
  - `3` (Organization, Responsibilities, Resources, Standards): Subcategories `3.1` to `3.6`
  - `4` (HSE Risk Management): Subcategories `4.1` to `4.8`
  - `5` (Planning & Procedures): Subcategories `5.1` to `5.4`
  - `6` (Implementation & Performance Monitoring): Subcategories `6.1` to `6.5`
  - `7` (Audit & Review): Subcategories `7.1` to `7.2`
  - `8` (Other HSE Management / Achievements): Subcategories `8.1` to `8.2`

#### Aggregation Rule:
$$\text{Parent Score} = \frac{1}{N} \sum_{i=1}^{N} \text{Child Score}_i$$

*Example:* If Subcategory `8.1` scores `10` and `8.2` scores `6`, Parent Category `8` score is $\frac{10 + 6}{2} = 8.0$.

---

### 4. Recursive Folder Discovery

`discover_category_folders(base_dir)` uses recursive directory walking:
- Dynamically resolves arbitrary directory depth (e.g., `test_submissions_dedicated/PT Newport Marine Services/3. Pengorganisasian.../3.1 Struktur Organisasi...`).
- Matches folder numbers (`1`, `2`, `3.1`, ..., `8.2`) using robust regex matching regardless of naming variations.
- Automatically handles folder trees with or without parent directory wrappers.

---

### 5. Hybrid Chunking & Persistence Architecture

| Mode | In-Memory | DB Persistence | Latency Impact | Recommended Use |
| :--- | :---: | :---: | :---: | :--- |
| **`MEMORY_ONLY`** | ✅ Full | ❌ None | **Fastest** (0s DB overhead) | Research notebooks, batch experimentation |
| **`PERSIST_SELECTIVE`** | ✅ Full | ⚠️ Only if score $<6$ or review needed | **Balanced** (~80% storage reduction) | Production APIs with audit/appeal workflows |
| **`PERSIST_ALL`** | ✅ Full | ✅ Every chunk saved | **Slowest** (+12-15s per category) | Regulatory compliance & deep archive |

---

### 6. AI Recommendation Engine for Score 10

When a category scores below 10, the engine triggers a dual-layer recommendation pipeline:
1. **Rule-Based Gap Identification:** Compares extracted evidence against Knowledge Base `score_10` criteria and outputs missing document titles and required form numbers.
2. **LLM Contextual Refinement:** Ingests juror critique notes to formulate prioritized, concrete action steps (e.g., *"Upload Client-signed HSE Policy"*, *"Provide Delegation of Authority for MWT reports"*).

---

### 7. Interactive Batch HTML Dashboard

The generated `batch_evaluation.html` provides a complete visual command center:
- **Contract & Tender Header:** Company name, project title, evaluation period, scope, model engine.
- **Executive KPI Summary:** Exact matches count, discrepancies count, average score, average confidence, total pipeline duration.
- **Hierarchical Table:** Displays Parent Category aggregate averages with collapsible child rows.
- **`[Details ▾]` Accordion:** Expands full juror breakdown (Compliance, Evidence, HSE reasoning), consensus synthesis, and actionable recommendations.
- **Interactive Controls:** Live search filtering, filter chips (*All*, *Matches*, *Discrepancies*), and bulk expand/collapse.

---

## File Architecture Map

```
csms-ai/
├── engine/
│   ├── pipeline.py                 # Central pipeline orchestration & batch execution
│   ├── consensus/
│   │   └── consensus_agent.py      # Multi-juror consensus synthesis & gating
│   ├── jurors/
│   │   ├── base_juror.py           # Base juror interface supporting company_info
│   │   ├── compliance_juror.py     # Regulatory & certificate juror
│   │   ├── evidence_juror.py       # Evidence quality & coverage juror
│   │   └── hse_juror.py            # Practical safety execution juror
│   ├── recommendations/
│   │   └── recommendation_engine.py# Hybrid rule + LLM recommendation engine
│   ├── storage/
│   │   └── evidence_store.py       # In-memory TTL / PostgreSQL pgvector store
│   ├── utils/
│   │   ├── eval_config.py          # EvaluationConfig dataclass (company_info support)
│   │   ├── chunking_config.py      # ChunkingMode enum & persistence logic
│   │   └── scoring.py              # CSMS discrete snapping & calculation
│   └── viewers/
│       └── html_generator.py       # Single & Batch interactive HTML report generator
├── notebook_v3/
│   ├── 01_single_category_test.ipynb     # Single category test workflow
│   ├── 02_all_categories_batch_test.ipynb# Batch evaluation benchmark
│   └── 03_dedicated_company_batch_test.ipynb # Handover research & contractor workflow
├── test_submissions_dedicated/
│   └── PT Newport Marine Services/ # Real contractor submission package (29 folders)
│       └── information.json        # Contractor metadata & project parameters
└── outputs/
    └── html/                       # Generated interactive HTML dashboards & logs
```
