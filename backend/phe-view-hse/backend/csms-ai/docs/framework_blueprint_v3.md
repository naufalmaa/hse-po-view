# CSMS AI Agent Scoring Framework Blueprint v3

## Mission

Build a robust AI Scoring Engine that:

```text
Marine CSMS Folder
↓
Evidence Extraction
↓
Evidence Aggregation
↓
Validation
↓
AI Juror Scoring
↓
Consensus
↓
Recommended Score (Human Review Output)
```

and produces:

```json
{
  "category_id": "3.2",
  "recommended_score": 6,
  "confidence": 0.92,
  "evidence_found": [],
  "missing_evidence": [],
  "reasoning": []
}
```

before worrying about backend/frontend integration.

---

# STAGE A — AI SCORING ENGINE

---

# Phase A0 — Knowledge Engineering

Input:

```text
Marine CSMS Excel
```

Output:

```text
knowledge_base/

├── marine/
│
├── hierarchy.json
│
├── categories/
├── scoring_rules/
├── validation_rules/
├── document_requirements/
└── traceability/
```

Goal:

Convert Excel → Machine Readable Knowledge.

No AI yet.

---

# Phase A1 — Human Validation

Review:

```text
knowledge_base/marine/
```

Participants:

```text
HSE SME
CSMS Assessor
Business Owner
```

Acceptance:

```text
100% categories mapped
100% scoring mapped
100% documents mapped
```

---

# Phase A2 — Golden Test Cases

Folder:

```text
test_submissions/marine/

├── 3.1/
│   ├── score_0/
│   ├── score_3/
│   ├── score_6/
│   └── score_10/
│
├── 3.2/
│   ├── score_0/
│   ├── score_3/
│   ├── score_6/
│   └── score_10/
```

Each contains:

```text
actual supporting documents
```

plus:

```json
expected_result.json
```

example
```json
{
  "category_id": "3.2",
  "expected_score": 6,
  "notes": "Training program exists but management review absent"
}
```

Purpose:

Regression testing.

---

# Phase A3 — Evidence Prioritization Pipeline Architecture

This is now a permanent component.

Pipeline:

```text
ZIP
↓
Category Folder
↓
Document Classification
↓
Priority Assignment
↓
Extraction
↓
Aggregation
↓
Validation
↓
Scoring
```

---

## Tier 1

Mandatory Deep Analysis

Examples:

```text
HSE Plan
Procedure
Manual
Risk Assessment
ERP
Audit Report
Management Review
```

Process:

```text
OCR/Text
↓
LLM
```

---

## Tier 2

Structured Evidence

Examples:

```text
Training Matrix
Attendance
Competency Matrix
Equipment Register
```

Process:

```text
Parser
↓
JSON
```

LLM optional.

---

## Tier 3

Mass Documents

Examples:

```text
Certificates
Licenses
Training Certificates
Personnel Records
```

Process:

```text
Metadata Extraction
↓
Aggregation
```

No LLM.

---

# Phase A4 — Evidence Extraction Layer

This becomes one of the most important engine components.

---

## Mandatory Extraction Stack

### Native PDF

```text
PyMuPDF
pdfplumber
```

---

### Scanned PDF

Primary:

```text
PaddleOCR
```

Fallback:

```text
Surya OCR
```

---

### Images

```text
PaddleOCR
```

---

### Excel

```text
pandas
openpyxl
```

---

### Word

```text
python-docx
```

---

### PDF Tables

```text
Camelot
tabula-py
```

---

## Output Contract

Everything becomes:

```json
{
  "document_type": "",
  "metadata": {},
  "evidence": [],
  "confidence": 0.95
}
```

No scoring.

Only extraction.

---

# Phase A5 — Evidence Aggregation Layer

New Component:

```text
evidence_aggregator_agent
```

Input:

```text
20 certificates
5 training records
2 audit reports
```

Output:

```json
{
  "training_compliance": 92,
  "expired_certificates": 3,
  "audit_exists": true,
  "management_review_exists": false
}
```

Purpose:

Reduce LLM context.

---

# Phase A6 — Rule Validators

Target:

```text
70%-80%
```

deterministic evaluation.

Validators:

```text
date_validator
expiry_validator
certificate_validator
signature_validator
completeness_validator
consistency_validator
competency_validator
keyword_validator
```

No LLM.

---

# Phase A7 — Single Category Pilot

Recommended:

```text
3.2
```

or whichever category has:

```text
moderate complexity
multiple documents
clear score criteria
```

Build:

```text
Folder
↓
Extract
↓
Aggregate
↓
Validate
↓
Score
```

Only one category.

Success before scaling.

---

# Phase A8 — AI Scoring Layer

Now LLM enters.

Important:

LLM never sees raw documents.

LLM only sees:

```json
{
  "category_definition": {},
  "aggregated_evidence": {},
  "validation_results": {}
}
```

---

## Juror Architecture

Instead of:

```text
One Scoring Agent
```

Use:

```text
Compliance Juror

Evidence Juror

HSE Juror
```

---

### Compliance Juror

Checks:

```text
Criteria fulfillment
Missing requirements
```

---

### Evidence Juror

Checks:

```text
Evidence quality
Evidence completeness
```

---

### HSE Juror

Checks:

```text
Real-world HSE interpretation
```

---

# Phase A9 — Consensus Layer

Input:

```json
{
  "compliance": 6,
  "evidence": 6,
  "hse": 10
}
```

Output:

```json
{
  "recommended_score": 6,
  "confidence": 0.89,
  "requires_review": true
}
```

---

# Phase A10 — Human Review Output

Output:

```json
{
  "category_id": "3.2",
  "recommended_score": 6,
  "confidence": 0.92,
  "evidence_found": [],
  "missing_evidence": [],
  "reasoning": []
}
```

This becomes the UI payload later.

---

---

# Phase A11 — Create for Project Category

When Marine succeeds:

```text
knowledge_base/marine/
```

create another folder called:

```text
knowledge_base/project/
```

Agents and all the structures other than that will remain unchanged.
---

# Development Environment (Stage A)

For now:

```text
Jupyter Notebook
```

with:

```text
knowledge_base/
test_submissions/marine/
```

Hardcoded paths are acceptable.

No API.

No database.

No frontend.

Goal:

```text
Scoring Accuracy
```

only.

---

# LLM Strategy

## Development

Provider:

```text
OpenAI
```

Model:

```text
GPT-5
```

Purpose:

```text
Prompt Engineering
Knowledge Engineering
Agent Design
Reasoning Benchmark
```

---

Secondary:

```text
GPT-5-mini
```

Purpose:

```text
Regression Testing
Prompt Iteration
```

---

## Production (Local)

Provider:

```text
Ollama
```

Primary:

```text
qwen3:32b
```

Role:

```text
Scoring Jurors
Consensus
```

---

Secondary:

```text
qwen3:14b
```

Role:

```text
Classification
Low-priority extraction
```

---

Fallback:

```text
deepseek-r1:32b
```

Role:

```text
Disagreement Resolution
Low-confidence Escalation
```

---

# STAGE B — ENTERPRISE INTEGRATION

Only after:

```text
≥90% scoring accuracy
```

on golden test cases.

---

# Phase B1 — Engine Packaging

Convert notebook into:

```text
csms_engine/
```

Structure:

```text
csms_engine/

├── extractors/
├── aggregators/
├── validators/
├── jurors/
├── consensus/
└── schemas/
```

Expose:

```python
score_category(
    category_id,
    folder_path
)
```

---

# Phase B2 — API Layer

Wrap engine with:

```text
Fastify Service
```

Example:

```http
POST /csms/score
```

Input:

```json
{
  "submission_id": "",
  "category_id": ""
}
```

Output:

```json
{
  "recommended_score": 6
}
```

---

# Phase B3 — PostgreSQL Integration

Store:

```text
submissions
scores
evidence
audit_logs
review_decisions
```

No scoring logic in database.

Database only stores results.

---

# Phase B4 — React Integration

UI should only consume:

```json
{
  "recommended_score": 6,
  "confidence": 0.92,
  "reasoning": []
}
```

React should never perform scoring.

---

# Phase B5 — Existing App Merge

Final architecture:

```text
Existing React App
        │
        ▼
Existing Fastify Backend
        │
        ▼
CSMS AI Engine Service
        │
        ▼
Ollama
```

This keeps the AI engine independent and replaceable.

---

## One Final Recommendation

Because your categories typically contain:

```text
< 30 files
```

and mostly:

```text
PDF
Images
```

I would **not** introduce queues, Kafka, Celery, RabbitMQ, microservices, distributed workers, or vector databases in Stage A.

For the engine phase, keep it brutally simple:

```text
Folder
↓
Extract
↓
Aggregate
↓
Validate
↓
Score
↓
JSON Result
```

A simple, correct engine is far more valuable than a complex platform at this stage. The complexity should come later, after the scoring logic has been proven against real Marine CSMS submissions.
