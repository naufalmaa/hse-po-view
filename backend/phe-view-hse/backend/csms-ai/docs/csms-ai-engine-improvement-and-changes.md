# CSMS-AI Engine Improvements and Changelog

This document serves as a comprehensive log of the historical fixes, improvements, and architectural changes made to the CSMS-AI Evaluation Engine. It also outlines the backlog of future improvements required to make the system fully robust and production-ready.

---

## 🚀 Completed Improvements & Fixes

### 1. Fixed "0-Score / No Document" Hallucinations (JSON Corruption)
* **Problem**: The AI Jurors (`compliance_juror.py`, `evidence_juror.py`, `hse_juror.py`) were consistently returning a `0` score, claiming that "no evidence documents were submitted" even when documents were present in the database. This was caused by the extracted OCR text of large PDFs. When the engine called `json.dumps()` on `aggregated_evidence`, the payload exceeded token limits. The code previously attempted to solve this by blindly truncating the raw string (`ev_str = ev_str[:130000]`), which destroyed the JSON structure. The LLM received malformed JSON, failed to parse the `EXTRACTED_DOCUMENT_TEXTS` array, and falsely assumed no documents existed.
* **Fix**: Intercepted the document content *before* JSON serialization. Iterated over all `EXTRACTED_DOCUMENT_TEXTS` and safely truncated only the internal `extracted_text_content` strings (capped at 40,000 characters per document, appending `...[Text truncated for length]...`). The JSON array structure now remains fully intact, allowing the LLM to successfully parse and evaluate the evidence.

### 2. Eliminated API Performance Bottleneck (`list-contract.ts`)
* **Problem**: The `GET /contract-folders` API was extremely slow, taking up to 30 minutes to load for users. 
* **Fix**: Discovered that the endpoint was synchronously calling `generateApprovedEvaluations`, which generated large PDF/Excel reports on the fly every time the folder list was requested. Removed this blocking call, decoupling report generation from basic data retrieval. Folder metadata now loads instantly, and users can manually generate reports on demand.

### 3. Solved Evidence Cross-Contamination (Evidence Routing)
* **Problem**: The engine mapped document chunks to evaluation categories using only the base filename (e.g., `Sertifikat.pdf`). If multiple categories had a file named `Sertifikat.pdf`, the engine would cross-contaminate and send the wrong documents to the wrong AI evaluation category.
* **Fix**: Modified the chunk matching logic in `server/main.py` to use full relative path matching (LTree paths) instead of basic filename matching. This ensures that a document is strictly evaluated only within the specific category folder it was uploaded to.

### 4. Robust UUID Casting for PostgreSQL LTree
* **Problem**: The engine threw errors when querying the `csms_contract_folder` hierarchy. The PostgreSQL `asyncpg` driver received `contract_folder_id` as a raw string, causing a type mismatch against the UUID primary key in `ltree` traversal queries (`path <@ ...`).
* **Fix**: Explicitly casted `contract_folder_id` to `uuid.UUID(contract_folder_id)` in all database queries, preventing type mismatch crashes.

### 5. Fallback for OpenAI Connection Timeouts
* **Problem**: During large batch evaluations, concurrent requests to OpenAI's embedding model occasionally timed out or disconnected (`Server disconnected without sending a response`). This caused the entire evaluation pipeline to crash mid-way.
* **Fix**: Added a robust `try-except` fallback inside the text embedding function. If OpenAI fails, the system now returns a zero-vector (`[0.0]*1536`) and logs the error, allowing the rest of the evaluation pipeline to continue without completely halting.

### 6. Unified Markdown Formatting for UI and Excel Reports
* **Problem**: The AI's reasoning output (`ai_reasoning`) was messy, inconsistent, and often raw JSON strings. Additionally, the fallback response for truly empty folders lacked the explicit structural breakdown.
* **Fix**: Overhauled the `reasoning_text` generation template in `main.py` to strictly output a clean, unified Markdown structure:
  - `📝 Consensus & Recommendations for Score 10`
  - `⚖️ Juror Breakdown` (Separating Compliance, Evidence, and HSE juror scores and confidence)
  - `📊 Metrics` (Status, Final AI Score, Confidence)
  This exact structure is now strictly enforced even in the "No documents submitted" fallback scenario, maintaining UI layout consistency.

---

## 📋 Backlog & Next Improvements

While the engine is now highly functional, the following improvements are necessary to achieve 100% robustness and eliminate remaining edge cases.

### 1. Transition to Intelligent RAG over Naive Truncation
* **Current State**: We truncate large PDF texts to 40,000 characters to prevent token limit errors.
* **Risk**: Critical compliance data (e.g., a signature on the very last page of a 100-page document) might be truncated out, causing the AI to hallucinate that a signature doesn't exist.
* **Improvement**: Implement a Retrieval-Augmented Generation (RAG) system. Instead of feeding the whole text, embed the PDF chunks into a Vector DB (e.g., pgvector) and query the Top-K most relevant chunks based on the specific rubric requirements of that category.

### 2. Implement Exponential Backoff for OpenAI APIs
* **Current State**: If the OpenAI Embedding or Chat API disconnects, we either crash or use a zero-vector fallback.
* **Risk**: Zero-vectors destroy semantic meaning. If the Chat API fails, that category evaluation is lost.
* **Improvement**: Integrate the Python `tenacity` library to wrap all LLM/OpenAI calls with an exponential backoff-retry mechanism (e.g., retry 5 times with increasing delays before failing).

### 3. Implement Asynchronous Message Queues (Celery/Redis)
* **Current State**: Evaluations are run via `asyncio` inside the FastAPI event loop. 
* **Risk**: Evaluating an entire contract with 40+ folders and hundreds of pages of OCR takes a lot of RAM and HTTP connection time. If the backend server restarts, the evaluation state is lost.
* **Improvement**: Move the `_process_evaluation` function to a dedicated asynchronous worker queue like Celery or RQ (Redis Queue). This ensures reliability, persistence, and the ability to scale horizontally.

### 4. Improve OCR Table & Image Extraction
* **Current State**: The engine relies purely on text extraction. 
* **Risk**: If a user uploads a scanned image (non-text PDF), the extracted text is empty, and the AI assumes no documents were submitted. Furthermore, complex tables are often jumbled into unreadable raw text.
* **Improvement**: Utilize a Vision-Language Model (e.g., GPT-4o Vision or Claude 3.5 Sonnet) directly on the document images for specific categories that heavily rely on visual certificates, or integrate a robust OCR library (like Tesseract or AWS Textract) to pre-process scanned images.

### 5. Multi-Agent Verification Step
* **Current State**: The Consensus Agent blindly trusts the average of the 3 Jurors.
* **Risk**: If one Juror hallucinated or misunderstood the text, the consensus score is skewed.
* **Improvement**: Add a final "Verification Agent" that reviews the reasoning of the 3 Jurors against the rubric and overrides scores if it detects a logical fallacy in the jurors' reasoning.
