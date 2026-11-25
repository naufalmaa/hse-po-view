# csms-ai — Penilaian AI untuk CSMS

Service Python (FastAPI) yang menilai dokumen kontraktor per elemen K3LL (1 sampai 8.2) memakai rubrik, LLM, dan aturan skor, lalu menyimpan skor serta catatan formal ke database yang sama dengan backend. Dipanggil backend Fastify; tidak diakses langsung oleh browser.

Terkait: [README backend](../README.md) · [DEPLOY_DEMO](../../../../docs/safeview-demo/DEPLOY_DEMO.md) · [Panduan kalibrasi](../../../../docs/safeview-demo/GUIDE_KALIBRASI_AI.md) · [Analisis kalibrasi](../../../../docs/safeview-demo/ANALISIS_KALIBRASI_RUBRIK.md).

## 1. Cara kerja singkat

```
Backend: INSERT job (queued) ─► POST /evaluate {jobId} ─► engine (antrean, 1 job sekaligus)
  1. Ekstraksi    PDF per halaman, Office, gambar, ZIP/7Z/RAR. Halaman pindaian: OCR qwen3-vl, cadangan PaddleOCR.
                  Hasil disimpan per berkas (cache), berkas tak berubah tidak diekstrak ulang.
  2. Rubrik       Kriteria elemen dari rubrik aktif (Excel v4_rev, berversi) + maks. 3 koreksi evaluator.
  3. Bukti        Mode Cepat: bagian penting dokumen. Mode Menyeluruh: ringkasan tiap berkas terhadap AI CHECKS.
  4. Juri         Cepat: 1 juri. Menyeluruh: 3 juri (Kepatuhan, Bukti, HSE) + konsensus. Tiap juri menilai tiap AI CHECK.
  5. Aturan       Rubrik berkelas (Wajib/Utama/Pendukung): skor dihitung dari checklist. Kutipan bukti diverifikasi.
                  Keyakinan gabungan; di bawah 0,85 ditandai "perlu tinjauan".
  6. Simpan       ai_score, ai_status, catatan formal per elemen, skor induk dihitung ulang, pg_notify ke UI.
```

Skor AI adalah **rekomendasi**. Skor akhir tetap ditetapkan evaluator (admin).

| Mode | Isi | Batas waktu |
|---|---|---|
| Cepat | halaman penting, maks. 3 halaman pindaian per berkas, 1 juri | 10 menit per elemen (keras) |
| Menyeluruh | seluruh isi, ringkasan per berkas, 3 juri + konsensus | acuan ±30 menit per elemen, tidak dihentikan |

Job yang terputus (restart) dilanjutkan otomatis: elemen yang sudah dinilai dilewati dan berkas yang sudah diekstrak dipakai dari cache.

## 2. Prasyarat

- Python 3.10 atau lebih baru.
- Akses jaringan ke: PostgreSQL (DB yang sama dengan backend), vLLM (LLM utama), server vision qwen3-vl (OCR), dan opsional OpenAI (cadangan LLM).
- Pembaca RAR butuh paket Python `rarfile` (ada di requirements) **dan** satu alat eksternal: Linux `sudo apt install -y unrar` (Ubuntu: repo `multiverse`; Debian: `non-free`) atau `unar`; Windows pasang 7-Zip. Paket `7zip`/`p7zip-full` di Debian/Ubuntu umumnya tidak membaca RAR (butuh `p7zip-rar`). ZIP dan 7Z tidak butuh alat ekstra. Cek: `GET /health` → `"rar": true`.
- `UPLOADS_DIR` yang **sama persis** dengan backend (path absolut di server).
- Ruang disk dan RAM untuk PaddleOCR (model diunduh saat pertama dipakai). pm2 memulai ulang proses di atas 4 GB.

## 3. Instalasi

```bash
cd backend/phe-view-hse/backend/csms-ai
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt            # Windows: .venv\Scripts\pip
cp .env.development.example .env                     # isi nilai sebenarnya (git-ignored)
```

## 4. Konfigurasi (env)

File dipilih berurutan: `ENV_FILE` → `.env.<CSMS_ENV>` → `.env`. Nilai yang sudah ada di environment proses **tidak** ditimpa file. Template: `.env.*.example` (hanya placeholder; **jangan menaruh API key atau password asli di file `*.example`**, berkas itu masuk git).

| Variabel | Bawaan | Keterangan |
|---|---|---|
| `DATABASE_URL` | dev lokal | `postgresql://<USER>:<PASSWORD>@<HOST>:5432/<DB>?sslmode=disable`. **Selalu di-set.** Bawaan kode mengarah ke database dev lokal |
| `UPLOADS_DIR` | `../uploads` | Path absolut, sama dengan backend |
| `CSMS_AI_HOST`, `CSMS_AI_PORT` | `0.0.0.0`, `8000` | Di server pakai `127.0.0.1` (internal). Dev 8000, prod 8001, demo 8002 |
| `CSMS_ENV` | | `production` mematikan auto-reload |
| `CSMS_AI_CONCURRENCY` | 1 | Jumlah job paralel. Satu server vLLM: biarkan 1 |
| `LLM_<ROLE>_ENDPOINT`, `LLM_<ROLE>_MODEL` | `configs/model_roles.json` | `ROLE` = `REASONING`, `CONSENSUS`, `VISION`. Mengganti endpoint tanpa edit JSON |
| `LLM_TIMEOUT_SECONDS` | per role | Timeout panggilan LLM |
| `LLM_MAX_PROMPT_CHARS` | 40000 | Batas isi prompt (konteks model 16k token) |
| `OPENAI_API_KEY`, `OPENAI_FALLBACK_MODEL` | kosong | Cadangan bila vLLM gagal. Model: `gpt-6-luna`. Tanpa key, fallback tidak aktif |
| `CSMS_AI_FAST_ELEMENT_MIN` | 10 | Batas mode Cepat per elemen (menit) |
| `CSMS_AI_THOROUGH_JOB_CAP_MIN` | 1440 | Batas aman total job Menyeluruh (menit), jaring pengaman agar tidak menggantung selamanya |
| `CSMS_AI_JOB_TIMEOUT_MIN` | 90 | Dipakai bersama batas di atas untuk job Menyeluruh (nilai terbesar berlaku). Job Cepat dibatasi `29 × CSMS_AI_FAST_ELEMENT_MIN + 15` menit |
| `CSMS_AI_EVIDENCE_CHARS` / `CSMS_AI_FAST_EVIDENCE_CHARS` | 34000 / 12000 | Anggaran teks bukti per elemen |
| `CSMS_AI_OCR_FIRST_PAGES` / `CSMS_AI_OCR_LAST_PAGES` | 55 / 5 | Halaman pindaian yang di-OCR per PDF |
| `CSMS_AI_VISION_TIMEOUT` / `CSMS_AI_VISION_PARALLEL` | 60 / 4 | OCR vision: timeout dan paralel |
| `CSMS_AI_OCR_DPI`, `CSMS_AI_MIN_PAGE_TEXT` | 130, 40 | Resolusi OCR; halaman dengan teks lebih sedikit dianggap pindaian |
| `CSMS_AI_ARCHIVE_MAX_FILES` / `CSMS_AI_ARCHIVE_MAX_MB` | 500 / 1024 | Batas isi arsip ZIP/7Z/RAR |
| `CSMS_AI_EMBED_CHUNKS` | 0 | `1` mengaktifkan embedding (butuh Ollama; tidak dipakai penilaian) |
| `OLLAMA_BASE_URL`, `OLLAMA_EMBED_MODEL` | | Hanya untuk embedding |

### Endpoint LLM per jaringan

Alamat server LLM berbeda menurut tempat engine berjalan. `configs/model_roles.json` hanya berisi **nilai bawaan** (`localhost`). Di server, timpa lewat `.env.<env>`:

| Peran | Variabel | Bawaan (JSON) | Di server (internal) |
|---|---|---|---|
| Juri (reasoning) | `LLM_REASONING_ENDPOINT` | vLLM `:8000/v1` | alamat internal vLLM `192.168.x.x:8000/v1` |
| Konsensus | `LLM_CONSENSUS_ENDPOINT` | vLLM `:8000/v1` | sama dengan reasoning |
| OCR (vision) | `LLM_VISION_ENDPOINT` | qwen3-vl `:5163/v1` (host berbeda dari vLLM) | alamat internal server vision `192.168.x.x:5163/v1` |

- **Ketiganya harus di-set di server.** Peran yang tidak di-set memakai alamat bawaan JSON; dari server alamat itu biasanya tidak terjangkau (`curl` mengembalikan `000`), sehingga skor gagal ("AI tidak tersedia") atau OCR turun ke PaddleOCR.
- `VLLM_BASE_URL` pada `.env.*.example` lama **tidak dipakai kode**. Yang berlaku hanya `LLM_*_ENDPOINT` (dan `LLM_*_MODEL`).
- Cek dari server: `curl -s -m 5 -o /dev/null -w "%{http_code}
" <endpoint>/models` (200 = terjangkau, 000 = tidak). `/health` menampilkan `db`, `llm` (juri), `vision`, dan `uploads_dir`; `python -m server.preflight` memeriksa ketiga endpoint sekaligus.
- Setelah mengubah `.env`: `pm2 restart <app> --update-env`.

## 5. Menjalankan

```bash
# Dev (auto-reload: menyimpan .py me-restart server dan MELANJUTKAN job yang sedang jalan)
.venv/bin/python -m server.main
# atau
.venv/bin/uvicorn server.main:app --reload --port 8000

# Server (pm2; aplikasi csms-ai-dev / csms-ai-prod / csms-ai-demo di ecosystem.config.cjs)
pm2 start ecosystem.config.cjs --only csms-ai-demo && pm2 save
pm2 logs csms-ai-demo --lines 40
```

Saat start engine: menutup job `processing` yang tertinggal (dilanjutkan), mengakhiri job `queued` > 24 jam, dan memuat rubrik bawaan **hanya bila belum ada versi rubrik aktif**.

### Pemeriksaan

```bash
curl -s http://127.0.0.1:<PORT>/health
# {"status":"ok","rar":true,"vision":true,"llm":true,"db":true,"uploads":true,"uploads_dir":"..."}  (503 bila DB gagal)
.venv/bin/python -m server.preflight                            # pemeriksaan lengkap sebelum pm2 start
curl -s -m 5 <LLM_REASONING_ENDPOINT>/models | head -c 200      # vLLM terjangkau?
```

| Kolom `/health` | Arti |
|---|---|
| `status` | Proses hidup. **Tidak** memeriksa database atau LLM |
| `rar` | Pembaca RAR tersedia |
| `vision` | Server OCR qwen3-vl terjangkau. `false` berarti pindaian dibaca PaddleOCR (lebih lambat dan kurang akurat) |

Bila database tidak terjangkau saat start, engine berhenti dengan `Application startup failed`.

## 6. Endpoint

| Method | Path | Fungsi |
|---|---|---|
| GET | `/health` | Kesehatan proses (lihat atas) |
| POST | `/evaluate` | Body `{"jobId": "<uuid>"}`. Backend membuat baris job lebih dulu; 409 bila sudah berjalan |
| GET | `/jobs/{job_id}` | Status job |
| POST | `/rubric/import` | Body base64 Excel (format kolom rubrik) → versi baru aktif |
| GET | `/rubric/export` | Unduh rubrik (aktif, atau `?version_id=`) sebagai Excel |

Admin memakai fitur rubrik lewat UI (**ADMIN > AI CSMS**); backend meneruskan ke endpoint ini.

## 7. Rubrik dan kalibrasi

- Rubrik marine bawaan: `knowledge_base/marine/source/MARINE-kriteria_penilaian_CSMS_for_AI_rules_v4_rev.xlsx` (29 elemen, 20 kolom). Tersimpan berversi di `csms_ai_rubric_version` / `csms_ai_rubric_item`; hasil AI selalu bisa ditelusuri ke versinya.
- Kriteria ditulis sebagai AI CHECK: `[Check_NN_Nama][Wajib|Utama|Pendukung]: apa yang harus terlihat`. Kelas menentukan skor: Wajib = bukti inti (tanpa ini maks. 3), Utama = menentukan 6, Pendukung = hanya membedakan 6 dan 10. Rubrik tanpa kelas tetap memakai skor juri.
- Koreksi evaluator (`csms_ai_feedback`) dipakai juri sebagai contoh: maks. 3 per elemen, koreksi asli didahulukan dari yang sintetis.
- Skrip kalibrasi sintetis: `python -m scripts.calibrate_rubric analyse|draft|feedback` (draf selalu **tidak aktif**; aktivasi lewat UI). Panduan: [GUIDE_KALIBRASI_AI.md](../../../../docs/safeview-demo/GUIDE_KALIBRASI_AI.md).
- Uji versi rubrik di folder final tanpa mengubah hasil AI-nya: tombol **Uji** di ADMIN > AI CSMS (job `trial`).

## 8. Struktur folder

| Folder / berkas | Isi |
|---|---|
| `server/` | FastAPI: `main.py` (job, antrean, endpoint), `rubric.py`, `scoring_rules.py`, `reasoning_format.py`, `pipeline/` (ekstraksi, ringkasan, rag, juri), `config.py`, `db.py`, `notify.py` |
| `engine/` | Ekstraktor (PDF, OCR, arsip), juri, konsensus, provider LLM (vLLM, OpenAI) |
| `knowledge_base/marine/` | Rubrik bawaan (`source/`), hierarki kategori, aturan lama |
| `configs/` | `model_roles.json` (endpoint dan model per peran LLM) |
| `scripts/` | `calibrate_rubric.py` dan alat bantu |
| `tests/` | Uji unit |
| `agents/`, `schemas/`, `validators/`, `viewer/`, `docs/` | Definisi dan dokumen kerangka awal |
| `notebook*`, `outputs/`, `scratch/`, `reports/`, `data/` | Eksperimen dan keluaran lokal; **tidak ikut deploy** |
| `ecosystem.config.cjs` | Definisi pm2 (dev 8000, prod 8001, demo 8002) |

Tabel yang dipakai (DB backend): `csms_contract_folder`, `csms_ai_evaluation_job`, `csms_evidence_chunk`, `csms_ai_rubric_version`, `csms_ai_rubric_item`, `csms_ai_feedback`, `csms_ai_file_summary`, `csms_ai_trial_snapshot`, `csms_ai_trial_result`. Event realtime lewat `pg_notify('csms_ai_evaluation_channel', ...)`. Skema dibuat backend (auto-ensure); engine hanya menambah tabel rubrik bila belum ada.

## 9. Deploy

Ringkas (rinci di DEPLOY_DEMO.md §4):

```bash
# laptop: paketkan tanpa venv, env, dan berkas eksperimen
cd backend/phe-view-hse/backend
tar --exclude=.venv --exclude='notebook*' --exclude=outputs --exclude=scratch --exclude='*.rar' --exclude='.env*' -czf /tmp/csms-ai.tgz csms-ai
scp -P <SSH_PORT> /tmp/csms-ai.tgz <SSH_USER>@<IP_SERVER>:/srv/hse-proview/backend/tmp
# server
tar -xzf /srv/hse-proview/backend/tmp/csms-ai.tgz && cd csms-ai
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
# buat .env.<env> (chmod 600), lalu:
pm2 start ecosystem.config.cjs --only csms-ai-<env> && pm2 save        # pertama kali
pm2 restart csms-ai-<env> --update-env                                 # update berikutnya (kode lama tetap di memori sampai di-restart)
curl -s http://127.0.0.1:<PORT>/health
pm2 logs csms-ai-<env> --lines 60 | grep -E "Rubric|rubric|startup"    # harus ada "Rubric MARINE seeded" pada start pertama
```

Cek versi kode yang berjalan: `/health` versi baru memuat kunci `vision`, dan
`curl -s http://127.0.0.1:<PORT>/rubric/export -o /dev/null -w "%{http_code}"` mengembalikan 200 (rubrik sudah ada) atau 404 dengan isi `Rubrik tidak ditemukan` (rute ada, rubrik belum dimuat). Isi `Not Found` berarti engine lama masih berjalan.

Dari server, vLLM dan server vision harus terjangkau (`curl -s -m 5 <endpoint>/models`).

## 10. Uji

```bash
.venv/bin/python -m unittest discover -s tests          # 28 uji: LLM gagal, ekstraksi, rubrik, aturan skor
```

Uji end-to-end (Cypress, mesin AI nyata, DB uji): [frontend/phe-view-hse/cypress/README.md](../../../../frontend/phe-view-hse/cypress/README.md).

## 11. Troubleshooting

| Gejala | Penyebab umum |
|---|---|
| `Application startup failed` | Database tidak terjangkau atau `DATABASE_URL` salah |
| ADMIN > AI CSMS kosong ("0 elemen", riwayat versi kosong) | Rubrik bawaan belum dimuat ke **database yang dipakai backend**. Penyebab: engine lama belum di-restart; engine memakai `DATABASE_URL` ke DB lain; atau pemuatan gagal (log `Warning: rubric not seeded: ...`, mis. berkas Excel bawaan tidak ada). Bila API gagal, halaman juga tampak kosong. Lihat DevTools → Network `.../rubric/versions`. Jalan keluar cepat: tombol **Impor Excel** dengan berkas di `knowledge_base/marine/source/` |
| Job menggantung / 409 terus | `select id,status,created_at from csms_ai_evaluation_job where status in ('queued','processing');` Engine melanjutkan job `processing` saat start |
| "AI tidak tersedia untuk elemen ini" | LLM gagal (vLLM mati dan OpenAI tanpa key/gagal), atau JSON model terpotong. Cek log `[VLLM] attempt ... failed` |
| "Upload folder not found" / berkas dilaporkan hilang | `UPLOADS_DIR` engine beda dengan backend, atau berkas belum disalin ke server |
| RAR tidak terbaca | `/health` menunjukkan `"rar": false`. Cek `.venv/bin/python -c "import rarfile"` (gagal = `pip install -r requirements.txt`) dan `which unrar unar`. Pasang alatnya lalu `pm2 restart` (deteksi hanya saat start) |
| OCR lambat dan kualitas turun | `/health` `"vision": false`: server qwen3-vl tidak terjangkau **dari server ini** (`curl -s -m 5 -o /dev/null -w "%{http_code}
" <endpoint vision>/models`). Atur `LLM_VISION_ENDPOINT` ke alamat yang terjangkau (bawaan di `configs/model_roles.json`). Pindaian lalu dibaca PaddleOCR (butuh paketnya terpasang dan model terunduh) |
| Skor semua 3 pada mode Cepat | Wajar untuk pra-penilaian: hanya bagian penting yang dibaca. Pakai mode Menyeluruh untuk skor akhir |
| Menyimpan `.py` saat job berjalan | Mode dev auto-reload me-restart engine; job dilanjutkan, tetapi hindari saat uji panjang. Set `CSMS_ENV=production` untuk mematikan reload |
