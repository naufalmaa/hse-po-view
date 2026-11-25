# Cypress — CSMS AI scoring (real data)

Tests the whole scoring path on **real rows in the DB and real files in `uploads_demo`**:
UI/API → Fastify → csms-ai (FastAPI) → vLLM → DB → realtime → UI.

| Spec | Needs engine+LLM | What it checks |
|---|:-:|---|
| `01-api-contract.cy.ts` | no | auth (401), body validation (400, was a 500), unknown folder/job, active-job lookup, **engine offline ⇒ 503 and no orphan job** |
| `02-real-data-sample.cy.ts` | no | seeded random contract + stratified element sample really exist in DB and on disk (non-empty PDFs), all 8 K3LL groups covered, data anonymised |
| `03-scoring-live.cy.ts` | **yes** | real evaluation: 202 → duplicate 409 → progress → completed; every element: score ∈ {0,3,6,10}, ≥3 with files, accept ⇔ ≥6, juror breakdown present, **no fabricated/“unavailable” text**, scores **grounded** in the PDF text (reasoning cites real content), jurors/consensus consistent, root 0..100, no `PROCESSING:` left. Writes `cypress/reports/csms-ai-scoring-report.md` |
| `04-ui-evaluation.cy.ts` | no (opt-in trigger: yes) | login form (SafeView branding), contract page, AI score + per-element verdicts render, no error toast. `E2E_UI_TRIGGER=1` also clicks *Re-Evaluate AI* |
| `05-llm-outage.cy.ts` | yes (outage mode) | vLLM **and** OpenAI unreachable (`start-engine.sh outage`, `E2E_PHASE=outage`): job still ends, every element "AI tidak tersedia", previous scores untouched, no stuck lock |
| `07-job-lifecycle.cy.ts` | yes | queue position + "Menunggu antrian" message, cancel queued (engine skips) / running (engine stops, not overwritten), engine-health endpoint, UI queue card + cancel button |
| `08-granular-scoring.cy.ts` | yes | element / group evaluation (admin only, one lock per assessment folder), "retry failed elements", formal juror note, UI menu + juror cards |
| `09-modes-rubric-feedback.cy.ts` | yes | mode dialog on every run (fast/thorough info, cancel = no job), element fast run ≤ 10 min labelled "Mode: Cepat", "priority only" target count, evaluator correction stored only when score ≠ AI, admin page (AI quality, rubric edit ⇒ new active version, re-activate, Excel export), all admin only |
| `10-dashboard-apply-tutorial.cy.ts` | no (uses AI results already in the test DB) | apply preview (status follows score, default selection = not assessed and confidence >= 0.85), final folder locked (409), Result CSMS AI dashboard (KPIs, 8 categories, AI note, Excel export, "only different"), tutorial (highlight on first visit, list per role, tour runs/closes, progress kept, PDF downloadable), contractor sees only its tutorials |
| `tutorial/capture.cy.ts` | no (opt-in `E2E_CAPTURE=1`) | screenshots for the per-role PDF guides; run with `--config trashAssetsBeforeRuns=false`, then `npx tsx scripts/build-tutorial-pdf.ts` in the backend |
| `06-stability.cy.ts` | yes (`E2E_PHASE=stability`, after 03) | second full run: 3 documents replaced by **negative controls** (irrelevant / draft-expired / blank) must not keep a top score; untouched elements must be repeatable |

Spec 03 FAILS (not skips) when the engine, vLLM or DB is unreachable (`E2E_REQUIRE_LIVE=1`, default). 04/05/06 skip unless their phase is set.

## Safety
The live spec overwrites `ai_score/ai_reasoning`, so it runs on a **throw-away copy** (`safeview_hse_test` + `uploads_test`) and the DB helper refuses any database whose name lacks `test`.

## Run
```bash
# 1. test DB = copy of the demo DB
PGPASSWORD=<pw> bash cypress/scripts/prepare-test-db.sh

# 2. backend on :3101 (backend/.env.test from .env.test.example; UPLOADS_DIR=../uploads_test)
cd backend/phe-view-hse/backend && ENV_FILE=.env.test NODE_ENV=development npx tsx src/server.ts

# 3. csms-ai on :8003 (csms-ai/.env.test from .env.test.example; needs `pip install -r requirements.txt`)
bash frontend/phe-view-hse/cypress/scripts/start-engine.sh          # normal ;  `... outage` for spec 05

# 4. frontend (demo branding) on :5173 pointing to the test backend
cd frontend/phe-view-hse && VITE_APP_BASE_URL=http://127.0.0.1:3101 npx vite --mode demo --host 127.0.0.1 --port 5173

# 5. tests
export E2E_PGPASSWORD=<pw>
npm run cy:ai                       # 01-04 (headless)
E2E_PHASE=stability npx cypress run --e2e --spec cypress/e2e/csms-ai/06-stability.cy.ts
# stop engine, `start-engine.sh outage`, then:
E2E_PHASE=outage npx cypress run --e2e --spec cypress/e2e/csms-ai/05-llm-outage.cy.ts
npm run cy:open                     # interactive
```

Environment knobs (all optional): `E2E_SEED` (default `20261101`; `random` for a new sample, the seed is printed/reported), `E2E_FOCUS_PER_GROUP` (default 1), `E2E_JOB_TIMEOUT_MS` (default 45 min), `E2E_USER/E2E_PASSWORD`, `E2E_API_URL`, `E2E_ENGINE_URL`, `E2E_DB`, `E2E_UPLOADS_DIR`, `PSQL_BIN`, `E2E_UI_TRIGGER`.

A full contract is evaluated per run (29 elements × 3 jurors + consensus ≈ 42–49 s each with the internal vLLM): spec 03 ≈ 21 min, spec 06 ≈ 24 min, spec 05 ≈ 4 min.

Python unit tests for the engine itself (no LLM, no DB): `cd csms-ai && python -m unittest discover -s tests`.
