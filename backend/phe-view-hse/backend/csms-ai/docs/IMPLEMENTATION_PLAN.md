# CSMS AI Evaluation: Implementation Plan

Integrasi CSMS-AI (Python) sebagai service evaluasi otomatis, dipanggil dari Fastify, hasil real-time ke frontend via WebSocket.

**Prinsip:** Selesaikan FastAPI dulu sampai stabil dan teruji, baru integrasi ke Fastify.

---

## Fase 0: Prasyarat

- [ ] Extension `vector` (pgvector) sudah terpasang di PostgreSQL
- [ ] `bun run db:push` berhasil tanpa error (schema sudah ter-migrate)
- [ ] Ollama/VLLM server aktif dan bisa diakses
- [ ] Python venv aktif: `cd backend/csms-ai && venv\Scripts\activate`

---

## Fase 1: FastAPI Server (Python) — DONE

### 1.1 Setup Dasar — DONE

- [x] `fastapi`, `uvicorn`, `asyncpg`, `httpx` ditambahkan ke `requirements.txt`
- [x] `server/main.py` — FastAPI app entry point
- [x] `server/config.py` — load `.env` (DATABASE_URL, OLLAMA_BASE_URL, OPENAI_API_KEY)
- [x] `server/db.py` — asyncpg connection pool

### 1.2 Endpoint Inti — DONE

- [x] `POST /evaluate` — BackgroundTasks, return 202 langsung
- [x] `GET /jobs/{jobId}` — cek status job
- [x] `GET /health` — health check

### 1.3 Document Extraction → DB — DONE

- [x] `server/pipeline/extraction.py` — ExtractorRouter + chunk + INSERT csms_evidence_chunk
- [x] `server/pipeline/embedding.py` — OpenAI text-embedding-3-small + UPDATE embedding

### 1.4 RAG Retrieval — DONE

- [x] `server/pipeline/rag.py` — pgvector similarity search + retrieve_evidence_chunks
- [x] `server/scripts/seed_knowledge_base.py` — seed dari knowledge_base/marine/ ke DB

### 1.5 AI Jurors + Consensus — DONE

- [x] `server/pipeline/jurors.py` — reuse ComplianceJuror, EvidenceJuror, HSEJuror
- [x] `server/pipeline/consensus.py` — ConsensusAgent.resolve() → save + NOTIFY

### 1.6 Simpan Hasil + Notify — DONE

- [x] UPDATE csms_contract_folder (ai_score, ai_status, ai_reasoning, ai_processed_at)
- [x] UPDATE csms_ai_evaluation_job (status, juror_scores, completed_at)
- [x] NOTIFY csms_ai_evaluation_channel
- [x] Error handling: UPDATE job SET status = 'failed'

### 1.7 SQL Trigger — DONE

- [x] `server/scripts/trigger_notify.sql` — auto NOTIFY on status change

### 1.8 Test End-to-End (Python Saja) — TODO

- [ ] Install deps: `pip install -r requirements.txt`
- [ ] Seed knowledge base: `python -m server.scripts.seed_knowledge_base`
- [ ] Jalankan trigger SQL di psql: `\i server/scripts/trigger_notify.sql`
- [ ] Start server: `python -m server.main`
- [ ] Insert test job ke DB
- [ ] `POST /evaluate { jobId }`
- [ ] Cek `csms_contract_folder` — ai_score, ai_reasoning terisi
- [ ] Cek `csms_ai_evaluation_job` — status = 'completed'

---

## Fase 2: Integrasi Fastify — DONE

### 2.1 Route Trigger Evaluasi — DONE

- [x] `routes/v1/user/csms/contract/folder/evaluate.ts` — POST /evaluate + GET /evaluate/status
- [x] Validasi: folder exists, isComplete = true, belum ada job aktif
- [x] INSERT job + fetch ke FastAPI (fire-and-forget)

### 2.2 Service Layer — DONE

- [x] `services/csms/contract/ai-evaluation.service.ts`
  - `getFolderForEvaluation(folderId)`
  - `hasActiveJob(folderId)`
  - `createEvaluationJob(folderId, userId)`
  - `getJobStatus(jobId)`

### 2.3 DB Listener → WebSocket — DONE

- [x] `db/listener.ts` — LISTEN csms_ai_evaluation_channel
- [x] `handleAiEvaluationNotification()` — broadcast ke user + admin

### 2.4 Config — DONE

- [x] `CSMS_AI_SERVICE_URL` di env.config.ts (default: http://localhost:8000)
- [x] Ditambah ke `.env.dev`

### 2.5 Test End-to-End — TODO

- [ ] Jalankan Python FastAPI: `cd backend/csms-ai && python -m server.main`
- [ ] Jalankan Fastify: `cd backend && bun run dev`
- [ ] POST `/api/v1/user/csms/contract/folder/evaluate` { folderId }
- [ ] Pastikan 202 dikembalikan
- [ ] Cek WebSocket terima `ai_evaluation_complete`
- [ ] Cek DB: csms_contract_folder (aiScore, aiStatus) + csms_ai_evaluation_job (completed)

---

## Fase 3: Hardening — TODO

- [ ] Retry mechanism
- [ ] Timeout guard
- [ ] Rate limit
- [ ] Structured logging
