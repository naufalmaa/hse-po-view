We're building:

```text
Document
↓
Evidence Prioritization Pipeline
↓
Evidence Model
↓
Validators
↓
AI Jurors
↓
Consensus
↓
Human Review
```

That is much closer to how a real CSMS assessor works.

---

# Updated Blueprint

I would officially rename it:

```text
CSMS AI Agent Scoring Framework Blueprint v2
```

Applicable for:

```text
Marine CSMS
Project CSMS
```

through knowledge base replacement only.

---

# Framework Overview

```text
Phase 0  Knowledge Engineering
Phase 1  Human Validation
Phase 2  Golden Test Cases
Phase 3  Evidence Prioritization Pipeline Architecture
Phase 4  Rule Validators
Phase 5  Evidence Extraction Layer
Phase 6  Single Category Pilot
Phase 7  AI Scoring Agents
Phase 8  Consensus Layer
Phase 9  Human Review Layer
Phase 10 Project CSMS Expansion
```

---

# Phase 0 — Knowledge Engineering

Goal:

Convert Marine CSMS Excel into machine-readable assets.

Output:

```text
knowledge_base/

├── hierarchy.json
├── categories/
├── scoring_rules/
├── validation_rules/
├── document_requirements/
└── traceability/
```

Critical:

No hallucination.

Every rule must map back to Excel.

---

# Phase 1 — Human Validation

Review:

```text
knowledge_base/
```

with:

* HSE SME
* CSMS Assessor
* Business Owner

Acceptance criteria:

```text
100% categories mapped
100% score criteria mapped
100% document requirements mapped
```

---

# Phase 2 — Golden Test Cases

Structure:

```text
test_submissions/

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

Each folder contains:

```text
actual supporting documents
```

plus:

```json
expected_result.json
```

---

# Phase 3 — Evidence Prioritization Pipeline Architecture

This becomes a core architecture layer.

---

## Objective

Reduce LLM workload.

Increase explainability.

Increase consistency.

---

## Pipeline

```text
Uploaded ZIP
↓
Folder Classification
↓
Document Classification
↓
Evidence Prioritization
↓
Metadata Extraction
↓
Evidence Aggregation
↓
Scoring
```

---

## Tier 1 Documents

Mandatory Deep Analysis

Examples:

```text
HSE Plan
Manual
Procedure
Risk Assessment
Management Review
Audit Report
Emergency Response Plan
```

Processing:

```text
OCR
+
LLM
```

---

## Tier 2 Documents

Structured Documents

Examples:

```text
Training Matrix
Training Record
Attendance Record
Competency Matrix
Equipment Register
```

Processing:

```text
Parser
↓
Structured JSON
↓
Optional LLM
```

---

## Tier 3 Documents

Mass Evidence

Examples:

```text
Certificate 001
Certificate 002
Certificate 003
...
Certificate 300
```

Processing:

```text
Rule Engine
↓
Metadata Extraction
↓
Aggregation
```

No LLM.

---

## Evidence Aggregator

New agent:

```text
evidence_aggregator_agent
```

Input:

```text
300 certificates
50 training records
10 reports
```

Output:

```json
{
  "training_compliance": 94,
  "expired_certificates": 3,
  "management_review_found": true,
  "audit_frequency": "quarterly"
}
```

Only aggregated evidence reaches scoring agents.

---

# Phase 4 — Rule Validators

Target:

```text
60%-80%
```

of scoring logic must be deterministic.

Validators:

```text
date_validator
expiry_validator
signature_validator
certificate_validator
competency_validator
keyword_validator
completeness_validator
consistency_validator
```

Rule engine first.

LLM second.

---

# Phase 5 — Evidence Extraction Layer

This is where I would make a major addition.

---

# Mandatory Extraction Stack

Do NOT rely on LLM alone.

Use a hybrid pipeline.

---

## PDF Text Documents

Examples:

```text
Native PDF
Digital PDF
```

Stack:

```text
PyMuPDF
+
pdfplumber
```

Reason:

Fast.

Accurate.

Cheap.

No OCR needed.

---

## Scanned PDF

Examples:

```text
Signed documents
Scanned certificates
Old audit reports
```

Stack:

```text
PaddleOCR
+
Surya OCR
```

Recommended priority:

```text
PaddleOCR = Primary
Surya OCR = Validation/Fallback
```

---

## Excel

Stack:

```text
openpyxl
pandas
```

No OCR.

No LLM.

---

## Word Documents

Stack:

```text
python-docx
mammoth
```

---

## Images

Stack:

```text
PaddleOCR
```

---

## Tables

Stack:

```text
Camelot
tabula-py
```

for PDF tables.

---

## Mandatory Output

Every extractor must produce:

```json
{
  "document_type": "",
  "metadata": {},
  "evidence": [],
  "confidence": 0.95
}
```

No scoring yet.

---

# Phase 6 — Single Category Pilot

Recommended:

```text
3.2
```

or whichever category:

* medium complexity
* multiple documents
* clear scoring

Build:

```text
ZIP
↓
Extract
↓
Validate
↓
Score
```

for one category only.

---

# Phase 7 — AI Scoring Agents

Now introduce LLM.

---

# Recommended Architecture

Not:

```text
One Agent
```

Use:

```text
Compliance Juror

Evidence Quality Juror

HSE Expert Juror
```

Then:

```text
Consensus Agent
```

---

# LLM Strategy

You requested two modes.

I completely agree.

---

# Development Mode

Current phase.

Provider:

```text
OpenAI
```

Recommended:

### Primary

```text
GPT-5
```

Use for:

```text
Prompt development
Prompt evaluation
Agent design
Knowledge engineering
```

---

### Secondary

```text
GPT-5-mini
```

Use for:

```text
Extraction testing
Validator testing
Regression tests
```

Lower cost.

---

# Production Mode

Provider:

```text
Ollama
```

---

### Primary Recommendation

```text
qwen3:32b
```

Reason:

Best balance of:

* reasoning
* document understanding
* JSON reliability
* multilingual capability

---

### Secondary Recommendation

```text
qwen3:14b
```

Use for:

```text
Extraction
Classification
Low-priority scoring
```

---

### Failsafe Recommendation

```text
deepseek-r1:32b
```

Use only when:

```text
confidence < threshold
```

or:

```text
juror disagreement
```

This becomes the escalation model.

---

# Phase 8 — Consensus Layer

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
  "final_score": 6,
  "confidence": 0.88,
  "escalate": true
}
```

---

# Phase 9 — Human Review Layer

Reviewer sees:

```text
Category
Score
Confidence
Evidence Found
Missing Evidence
Reasoning
```

Never raw documents first.

Evidence first.

---

# Phase 10 — Project CSMS Expansion

When Marine succeeds:

```text
knowledge_base/marine/
```

becomes:

```text
knowledge_base/project/
```

Agents remain unchanged.

This is the architecture validation test.

If agents need modifications for Project CSMS, then the framework is not truly configuration-driven.

---
