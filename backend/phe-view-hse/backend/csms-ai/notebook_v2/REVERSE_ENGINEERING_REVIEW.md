# CSMS AI Marine Scoring Review

## Scope

This review covers:

- Existing production scoring flow in `engine/pipeline.py`
- Existing batch evaluation in `notebook_v2/02_batch_evaluation_all_categories.ipynb`
- New reverse-engineering workflow in `notebook_v2/03_accuracy_improvement_reverse_engineering.ipynb`
- Marine knowledge base under `knowledge_base/marine/`
- Existing chunk databases under `notebook_v2/outputs/databases/`

Goal: improve AI score accuracy against human-reviewed `expected_result.json` values without immediately modifying production knowledge base or models.

## Before Method

### 1. Evidence extraction

`ExtractorRouter` selected an extractor by file extension:

- PDF: PyMuPDF, then OCR fallback for sparse text
- Excel: pandas sheet-to-CSV conversion
- Word: paragraph extraction
- Images: vision endpoint
- CSV, text, PowerPoint, email, and archives: specialized extractors

Output was a document object containing evidence strings and metadata.

### 2. Document classification

`DocumentClassifier` used filename keywords to classify documents into:

- Tier 1: deep analysis
- Tier 2: structured document
- Tier 3: mass evidence
- Unclassified

`PriorityAssigner` converted tiers to priority values.

### 3. Aggregation

`EvidenceAggregator` concatenated evidence strings and sent them to an LLM.

Limits:

- Around 4,000 characters per document
- Around 80,000 characters overall
- Flat concatenation rather than criterion-specific retrieval
- No explicit evidence-to-rule mapping
- No guarantee that every mandatory criterion reached jurors

### 4. Validation

`ValidatorEngine` selected validators from `VR-{category}.json`.

Configured validation methods included methods such as:

- `keyword_search`
- `date_validation`
- `signature_check`
- `table_check`
- `section_check`

Important implementation gap: not every configured method is registered in `ValidatorEngine`. Unknown methods return `is_valid: false` with a missing-validator reason.

### 5. Juror scoring

Three jurors evaluated the same aggregated evidence:

- Compliance Juror
- Evidence Juror
- HSE Juror

Prompts required discrete output values `0`, `3`, `6`, or `10`. Each juror returned score, confidence, and reasoning.

The jurors were mostly holistic. They did not need to prove every score through criterion-level evidence references.

### 6. Consensus and final score

`ConsensusAgent`:

1. Snapped each juror score to the CSMS scale.
2. Calculated an equal-weight average.
3. Snapped the average again.
4. Used an LLM to produce final reasoning.
5. Requested review if juror disagreement exceeded a threshold.

The production `snap_to_csms_scale()` used threshold bands. It also treated invalid values as `6`, which can hide upstream failures.

### 7. Expected result comparison

The batch notebook compared final prediction with `expected_result.json`.

It did not explain which criteria caused a prediction to match or miss the expected score.

### 8. Embedding enhancement

The batch notebook added:

- Fixed-size chunks
- OpenAI embeddings
- SQLite BLOB storage
- FTS5 keyword search
- Cosine similarity
- Hybrid retrieval
- Top-15 retrieval for every category

Observed result: embedding did not improve accuracy. Original accuracy was slightly better than enhanced-large accuracy.

## Before Method Problems

### A. Human score was treated as an opaque label

The system knew only `expected_score`, not the evidence criteria that justified it.

### B. Retrieval was not category-adaptive

Every category used the same `top_k=15`, even when category databases ranged from very small to extremely large.

### C. Retrieval could hide mandatory evidence

Top semantic chunks might exclude a required document, table row, date, signature, or implementation record.

### D. Score gates were implicit

The LLM was expected to infer whether evidence satisfied score conditions. No deterministic rule prevented a score `10` when mandatory criteria were missing.

### E. Structured evidence was flattened

Tables, Excel rows, archive contents, and document sections were represented as generic text chunks. This weakens exact field validation.

### F. Validator results were not fully authoritative

The pipeline generated summary records based largely on whether documents existed. It did not consistently propagate actual validator outcomes into score gates.

### G. Production and evaluation assumptions differed

The batch notebooks tested enhanced aggregation, but production `engine/pipeline.py` was not yet changed to use the new criterion-level workflow.

## After Method Implemented

The new implementation is documented in:

`notebook_v2/03_accuracy_improvement_reverse_engineering.ipynb`

This notebook is an evaluation and calibration workflow. It does not automatically overwrite production KB files.

### 1. Re-evaluate every category from existing databases

The notebook discovers all marine category folders and loads:

- Human-reviewed expected score
- Category KB
- Scoring rules
- Validation rules
- Document requirements
- Existing SQLite chunks

It supports the existing large or small embedding database through configuration.

### 2. Build source inventory

For every category, it records:

- Chunk count
- Character count
- Source filenames
- Document types
- Priority and tier metadata
- Keyword matches
- Mandatory-field matches
- Date mentions
- Signature mentions
- Table mentions

Every finding remains linked to source filenames or extracted chunk metadata.

### 3. Evaluate atomic criteria

The notebook evaluates separate criteria rather than asking one holistic question:

- `document_presence`
- `keyword_coverage`
- `mandatory_fields`
- `implementation_evidence`
- `temporal_validity`

Each criterion returns:

```json
{
  "type": "mandatory_fields",
  "status": "pass|partial|fail|unknown",
  "evidence": [],
  "confidence": 0.0
}
```

### 4. Calculate raw criterion score

Criterion statuses are converted into weighted evidence:

- `pass` = 1.0
- `partial` = 0.5
- `fail` = 0.0
- `unknown` = 0.0

Confidence weights are applied. The result is a raw score between `0` and `10`.

### 5. Apply upward final rounding

The notebook implements the requested final mapping:

- `raw <= 0` → `0`
- `0 < raw <= 3` → `3`
- `3 < raw <= 6` → `6`
- `6 < raw <= 10` → `10`

This differs from the old juror workflow because jurors can now produce continuous intermediate reasoning scores, while final reporting remains discrete.

### 6. Compare against human-reviewed expected score

For every category, the notebook compares:

- Human expected score
- Original pipeline prediction
- Enhanced embedding prediction
- Criterion-calibrated score

It reports exact correctness and score gaps.

### 7. Generate gap analysis

For categories where calibrated score is below expected, the notebook identifies failed or partial criteria, such as:

- Missing document presence
- Low keyword coverage
- Missing mandatory fields
- Weak implementation evidence
- Weak temporal evidence

### 8. Generate candidate KB expansions

Candidate files are written under:

`knowledge_base/marine/calibration/`

Candidate changes are separated from production KB and may include:

- Additional marine keywords
- Indonesian and English terminology variants
- Additional mandatory fields
- Marine document patterns
- Implementation-proof checks
- Score-gate suggestions

### 9. Save review artifacts

The notebook writes:

- `outputs/review/criterion_level_audit.json`
- `outputs/review/criterion_level_audit.csv`
- `knowledge_base/marine/calibration/candidate_*.json`

These artifacts provide an audit trail before any production merge.

## Before vs After Summary

| Area | Before | After implemented |
|---|---|---|
| Evaluation unit | Whole category evidence | Atomic criteria |
| Expected result | Score-only comparison | Score plus criterion audit |
| Evidence mapping | Implicit | Source-linked audit records |
| Aggregation | Flat LLM summary | Existing chunks re-evaluated by criterion |
| Retrieval | Same top-K pattern | Database inventory and category audit first |
| Document checks | Generic presence | Presence, types, fields, dates, implementation signals |
| Scoring | Jurors forced to `0/3/6/10` | Continuous criterion raw score, discrete final score |
| Rounding | Existing snap thresholds | Explicit upward rounding requested by user |
| Score explanation | Holistic juror reasoning | Criterion status, evidence, confidence, gaps |
| KB tuning | Direct production edits risk overfitting | Candidate KB files isolated under `calibration/` |
| Validation | Limited validator propagation | Calibration audit exposes validator and criteria gaps |
| Review process | Dashboard accuracy only | Audit JSON/CSV plus candidate KB review |
| Model tuning | First response to low accuracy | Delayed until KB and peer review stabilize |

## Important Limitations of Current After Method

The notebook is a tactical calibration prototype, not final production scoring logic.

### 1. Criterion extraction is heuristic

Keyword and phrase matching can produce false positives and false negatives. It should later be replaced or supplemented by structured extraction with explicit evidence references.

### 2. Criteria are currently generic

The five criteria apply to every category. Real CSMS categories need category-specific criteria derived from each `SR-*`, `VR-*`, and `DR-*` file.

### 3. Candidate KB entries need human review

Generated entries contain recommendations and placeholders. They must not be merged automatically.

### 4. Existing chunks may be weak

Fixed-size chunks can split tables, rows, sections, and certificate fields. Re-chunking should be added for:

- Excel rows and tables
- PDF pages and headings
- Certificates
- Logs and registers
- Archive-derived documents

### 5. Evidence references need stronger coordinates

Current references mostly use filename and chunk identity. Production annotations should include page, sheet, row, section, or table coordinates where available.

### 6. No holdout split yet

The current notebook audits all categories. It does not yet separate KB calibration categories from validation categories.

### 7. Production engine is not yet changed

The new notebook does not automatically alter `engine/pipeline.py`, juror prompts, validators, or production KB.

## Recommended Next Implementation

### Phase 1: Make annotations explicit

Add criterion-level annotation files beside each category:

```json
{
  "category_id": "4.1",
  "expected_score": 6,
  "criteria": [
    {
      "criterion_id": "risk_register_coverage",
      "status": "pass",
      "evidence_refs": [
        {
          "filename": "risk_register.pdf",
          "page": 4,
          "chunk_id": "abc123"
        }
      ],
      "notes": "All required work phases covered"
    }
  ]
}
```

### Phase 2: Convert every scoring rule to structured gates

Replace free-text-only rules with machine-readable conditions:

```json
{
  "score_gates": {
    "0": {"all_required_criteria": "absent"},
    "3": {"minimum_raw_score": 0.01, "maximum_raw_score": 3},
    "6": {"minimum_raw_score": 3.01, "maximum_raw_score": 6},
    "10": {
      "minimum_raw_score": 6.01,
      "required_criteria": ["all_mandatory_items", "implementation_proof"]
    }
  }
}
```

### Phase 3: Add category-specific criteria

Each category should define:

- Required documents
- Required fields
- Required implementation proof
- Validity rules
- Marine-specific terminology
- Criteria required for score `3`, `6`, and `10`
- Disqualifying missing evidence

### Phase 4: Add deterministic pre-scoring

Before jurors run:

1. Evaluate deterministic criteria.
2. Calculate evidence completeness.
3. Block score `10` if mandatory criteria are absent.
4. Block score above `0` only when evidence exists.
5. Send criterion facts and source references to jurors.

### Phase 5: Change juror prompts

Jurors should receive criterion records instead of only an aggregated summary:

- Criterion ID
- Requirement
- Status
- Evidence references
- Confidence
- Contradictions
- Missing evidence

Jurors should output continuous score plus criterion reasoning.

### Phase 6: Change consensus

Consensus should not be a free-form override. It should:

1. Validate juror criterion decisions.
2. Calculate weighted continuous score.
3. Apply mandatory score gates.
4. Apply upward rounding.
5. Set review flag for contradictions or missing references.

### Phase 7: Add calibration and holdout evaluation

Recommended split:

- Calibration set: categories used to expand KB
- Validation set: categories not used during KB expansion
- Peer-review set: new human-reviewed submissions later

Do not accept a KB change only because calibration accuracy increased.

### Phase 8: Tune models last

After KB and criterion annotations stabilize:

1. Compare juror models.
2. Tune prompts.
3. Tune embedding model and retrieval.
4. Evaluate on holdout and peer-review data.

## Current Accuracy Interpretation

The previous batch result should not be interpreted as an embedding failure alone.

The observed low accuracy mainly indicates:

- Systematic under-scoring
- Missing criterion-level gates
- Retrieval loss from fixed top-K
- Generic marine KB rules
- Weak structured-field extraction
- Possible mismatch between expected score intent and observable evidence

Changing from `text-embedding-3-small` to `text-embedding-3-large` cannot fix missing rules or missing evidence references by itself.

## Acceptance Criteria Before Production Merge

A KB expansion should be accepted only when:

- Every added criterion has a human-readable definition.
- Every expected pass has at least one evidence reference.
- Every score gate is testable.
- No production file is overwritten automatically.
- Calibration accuracy improves.
- Holdout accuracy does not materially regress.
- Score `10` requires explicit mandatory evidence.
- Score `0` is reserved for no evidence.
- Review flags remain visible for uncertainty.

## Final Status

### Completed

- Existing batch workflow reviewed.
- Existing embedding databases reused.
- Criterion-level reverse-engineering notebook created.
- Upward final rounding implemented in notebook.
- Candidate KB isolation implemented.
- Audit JSON and CSV output implemented.

### Not yet completed

- Production KB merge.
- Production pipeline integration.
- Category-specific criterion annotation for all 29 categories.
- Structured page/sheet/row evidence references.
- Holdout evaluation.
- Peer-human validation.
- Model tuning after KB stabilization.
