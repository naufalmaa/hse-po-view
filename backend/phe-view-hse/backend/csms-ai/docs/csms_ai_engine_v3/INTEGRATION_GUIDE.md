# CSMS AI Scoring Engine - Integration Guide

## For Fullstack Developers

This guide provides the complete integration specification for connecting backend APIs (FastAPI / Node.js) and frontend applications (React / Vue) with the CSMS AI Scoring Engine.

---

## 1. System Architecture & Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React/Vue)                    │
│  - Document upload / Contractor submission tree             │
│  - Project Meta Input (Title, Dates, Contractor Name)       │
│  - Hierarchical CSMS Scorecard (Parent 1-8 + Children)      │
│  - Interactive HTML Assessment Dashboard                    │
│  - AI Recommendations (Score 10 Roadmap)                    │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST API
┌──────────────────────────────▼──────────────────────────────┐
│                    Backend API (FastAPI)                    │
│  POST /api/v1/csms/evaluate                                 │
│  GET  /api/v1/csms/jobs/{jobId}                             │
│  GET  /api/v1/csms/reports/{jobId}/html                     │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                   CSMS AI Engine (Core)                     │
│  ┌────────────────────────┐    ┌─────────────────────────┐  │
│  │ EvaluationConfig       │    │ Recursive Discovery     │  │
│  │ (company_info context) │    │ (29 Category Folders)   │  │
│  └───────────┬────────────┘    └────────────┬────────────┘  │
│              │                              │               │
│              ▼                              ▼               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Hybrid Evidence Store (Memory / Postgres pgvector)    │  │
│  └───────────────────────────┬───────────────────────────┘  │
│                              │                              │
│              ┌───────────────┼───────────────┐              │
│              ▼               ▼               ▼              │
│       ComplianceJuror  EvidenceJuror     HSEJuror           │
│       {0, 3, 6, 10}    {0, 3, 6, 10}   {0, 3, 6, 10}        │
│              └───────────────┬───────────────┘              │
│                              ▼                              │
│                      ConsensusAgent                         │
│                              │                              │
│              ┌───────────────┴───────────────┐              │
│              ▼                               ▼              │
│     RecommendationEngine              HTMLGenerator         │
│     (Score 10 Guidelines)            (Batch Dashboard)      │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                      PostgreSQL Database                    │
│  - csms_contract_folder                                     │
│  - csms_ai_evaluation_job                                   │
│  - csms_evidence_chunk (conditional, persist_selective)     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Python Engine Invocation

Fullstack engineers can directly invoke the engine via Python or wrap it in FastAPI background tasks.

### Running a Dedicated Contractor Evaluation (Batch of 29 Categories)

```python
import os
from engine.pipeline import evaluate_all_categories
from engine.utils.eval_config import EvaluationConfig
from engine.utils.chunking_config import ChunkingMode

# 1. Prepare structured company context
company_info = {
    "title": "Rental Crew Boat 60 Pax (NMS Accomplish) To Support PHE OSES 4710007645",
    "date_start": "2023-08-01",
    "date_end": "2027-01-27",
    "evaluation_date": "2026-01-22",
    "company": "PT Newport Marine Services",
    "category": "marine"
}

# 2. Build configuration
config = EvaluationConfig(
    start_date=company_info.get("date_start"),
    end_date=company_info.get("date_end"),
    company=company_info.get("company"),
    marine_dir=os.path.join(os.getcwd(), "test_submissions_dedicated", "PT Newport Marine Services"),
    juror_role="reasoning_model",
    consensus_role="consensus_model",
    chunking_mode=ChunkingMode.PERSIST_SELECTIVE,  # Recommended for production
    persist_failed=True,
    company_info=company_info
)

# 3. Execute evaluation
report = evaluate_all_categories(config=config)

print(f"Status: Total {report['total_categories']} evaluated. Passed: {report['passed']}")
print(f"HTML Viewer generated at: {report['html_viewer_path']}")
```

> [!TIP]
> **Research & Handover Reference Notebook:**
> Refer to [`notebook_v3/03_dedicated_company_batch_test.ipynb`](file:///x:/naufal/Kerja/Kerja-an/Waviv/Project/PHE_HSE/apps/backend/phe-view-hse/backend/csms-ai/notebook_v3/03_dedicated_company_batch_test.ipynb) for the exact end-to-end execution workflow.

---

## 3. API Data Contracts

### 3.1 Trigger Evaluation: `POST /api/v1/csms/evaluate`

**Request Payload:**
```json
{
  "contractFolderId": "f7d98342-6e21-4f93-b1d8-4f51e938921a",
  "submissionDirectory": "/data/submissions/pt_newport_marine_services",
  "chunkingMode": "persist_selective",
  "companyInfo": {
    "title": "Rental Crew Boat 60 Pax (NMS Accomplish) To Support PHE OSES 4710007645",
    "date_start": "2023-08-01",
    "date_end": "2027-01-27",
    "evaluation_date": "2026-01-22",
    "company": "PT Newport Marine Services",
    "category": "marine"
  }
}
```

**Response (202 Accepted):**
```json
{
  "jobId": "9b3c4a10-2e45-4899-bfa2-9381c70e2814",
  "status": "processing",
  "totalCategories": 29,
  "createdAt": "2026-08-28T02:00:00Z"
}
```

---

### 3.2 Poll Job Status: `GET /api/v1/csms/jobs/{jobId}`

**Response (200 OK):**
```json
{
  "jobId": "9b3c4a10-2e45-4899-bfa2-9381c70e2814",
  "status": "completed",
  "totalCategories": 29,
  "passed": 6,
  "needsReview": 0,
  "failed": 0,
  "overallAiAverageScore": 3.4,
  "expectedBenchmarkAverage": 6.0,
  "accuracy": 20.7,
  "htmlViewerUrl": "/api/v1/csms/reports/9b3c4a10/html",
  "companyInfo": {
    "title": "Rental Crew Boat 60 Pax (NMS Accomplish) To Support PHE OSES 4710007645",
    "company": "PT Newport Marine Services",
    "date_start": "2023-08-01",
    "date_end": "2027-01-27",
    "evaluation_date": "2026-01-22"
  },
  "parentSummary": [
    { "parentId": "1", "name": "Kepemimpinan dan Komitmen", "score": 3.0, "expected": 6.0, "isParent": false },
    { "parentId": "2", "name": "Kebijakan dan Sasaran Strategis K3LL", "score": 3.0, "expected": 6.0, "isParent": false },
    { "parentId": "3", "name": "Organisasi, Tanggung Jawab, Sumber Daya", "score": 3.5, "expected": 6.0, "isParent": true },
    { "parentId": "4", "name": "Manajemen Risiko K3LL", "score": 3.0, "expected": 6.3, "isParent": true },
    { "parentId": "5", "name": "Perencanaan dan Prosedur", "score": 3.8, "expected": 6.3, "isParent": true },
    { "parentId": "6", "name": "Implementasi dan Pemantauan Kinerja", "score": 3.6, "expected": 5.0, "isParent": true },
    { "parentId": "7", "name": "Audit dan Tinjauan", "score": 3.0, "expected": 6.0, "isParent": true },
    { "parentId": "8", "name": "Manajemen K3LL - Pencapaian Lainnya", "score": 4.5, "expected": 8.0, "isParent": true }
  ],
  "results": [
    {
      "category_id": "8.1",
      "folder_name": "8.1 Sertifikasi dan Komitmen Manajemen K3LL",
      "expected_score": 10,
      "compliance_score": 6,
      "evidence_score": 6,
      "hse_score": 10,
      "consensus_score": 6,
      "final_score": 6,
      "confidence": 0.90,
      "status": "completed",
      "processing_time_sec": 34.8,
      "require_review": false,
      "final_reasoning": "ISO 9001 and ISO 45001 certificates are valid and present. ISO 14001 environmental certificate is missing.",
      "evidence_count": 4,
      "evidence_found": [
        "ISO 9001:2015 Quality Management Certificate",
        "ISO 45001:2018 Occupational Health & Safety Certificate"
      ],
      "missing_evidence": [
        "ISO 14001:2015 Environmental Management Certificate"
      ],
      "ai_recommendation_for_excellent_score": {
        "recommendations": [
          "Upload valid ISO 14001 Environmental Management Certificate",
          "Attach latest external audit surveillance report"
        ],
        "required_documents": ["ISO 14001 Certificate"],
        "priority_actions": ["Obtain ISO 14001 certification copy from QHSE department"]
      },
      "reasoning_records": [
        {
          "juror": "ComplianceJuror",
          "recommended_score": 6,
          "confidence": 0.90,
          "reasoning": ["Found ISO 9001 and ISO 45001. ISO 14001 missing, preventing score 10."]
        },
        {
          "juror": "EvidenceJuror",
          "recommended_score": 6,
          "confidence": 0.90,
          "reasoning": ["2 of 3 required certificates verified. High image resolution and valid accreditation stamps."]
        },
        {
          "juror": "HSEJuror",
          "recommended_score": 10,
          "confidence": 0.90,
          "reasoning": ["Robust HSE management system certified by accredited body."]
        }
      ]
    }
  ]
}
```

---

## 4. Frontend Integration Guidelines

### 4.1 Rendering the Hierarchical Scorecard

When presenting results in UI components (React/Vue table or dashboard):
1. **Display Parent Category Rows (1 to 8):**
   - For standalone categories (`1`, `2`), render direct score.
   - For composite categories (`3` to `8`), calculate the arithmetic mean of its subcategory children:
     $$\text{Parent Score} = \frac{\sum \text{Child Scores}}{\text{Count of Children}}$$
2. **Score Badging System:**
   - Score `10`: Blue (`#2563eb` bg, `#dbeafe` tint) - Full Compliance
   - Score `6`: Green (`#16a34a` bg, `#dcfce7` tint) - Substantial Compliance
   - Score `3`: Amber (`#d97706` bg, `#fef3c7` tint) - Partial Compliance
   - Score `0`: Red (`#dc2626` bg, `#fee2e2` tint) - Non-Compliant / No Evidence
3. **Accordion / Modal Drilldown:**
   - Display Juror verdicts side-by-side (`Compliance`, `Evidence`, `HSE`).
   - Display `ai_recommendation_for_excellent_score` in a callout card titled *"How to Achieve Score 10"*.
   - Embed direct link to `category_{id}.html` or iframe `batch_evaluation.html`.

---

## 5. Storage & Performance Optimization

| Mode | Recommended Use | In-Memory Extractor | DB Vector Storage |
| :--- | :--- | :---: | :---: |
| **`MEMORY_ONLY`** | Research & Local QA | Yes | No |
| **`PERSIST_SELECTIVE`** | Production API | Yes | Only when `score < 6` or `requires_review = True` |
| **`PERSIST_ALL`** | Strict Legal Audit | Yes | Yes (All chunks) |

---

## 6. Error Handling & Edge Cases

1. **Empty Folders (0 Files):**
   - The engine automatically short-circuits evaluation and awards **Score 0** with 100% confidence in $<0.01$s without calling LLM endpoints.
2. **Unrecognized Document Extensions:**
   - Only `.pdf`, `.docx`, `.xlsx`, `.png`, `.jpg`, `.jpeg` are extracted. Unparsed formats produce non-fatal entries in `warnings` array.
3. **Discrepant Jurors:**
   - If $|\text{Score}_{\text{juror } A} - \text{Score}_{\text{juror } B}| > 4$, `require_review` is set to `true` and flagged for human assessor verification.
