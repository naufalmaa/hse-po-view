# 02. Konfigurasi

Semua pengaturan dibaca dari variabel environment atau file env. Repo hanya berisi template (`*.example`) tanpa nilai rahasia; file env asli selalu diabaikan git. **Semua key harus dibuat baru oleh tim penerima**; tidak ada key lama yang diserahkan.

## File konfigurasi

| Bagian | Template | File yang dipakai | Cara memilih file |
| --- | --- | --- | --- |
| Backend | `backend/phe-view-hse/backend/.env.example` | `.env` | `ENV_FILE=.env.demo` untuk file lain |
| csms-ai | `backend/phe-view-hse/backend/csms-ai/.env.example` (+ `.env.production.example`, `.env.development.example`, `.env.demo.example`) | `.env` atau `.env.<nama>` | `ENV_FILE=<file>`, atau `CSMS_ENV=production` memilih `.env.production` |
| Frontend | `frontend/phe-view-hse/.env.example` | `.env`, `.env.demo` (mode demo) | Dibaca saat **build**, bukan saat runtime |
| Docker Compose | `.env.docker.example` (root repo) | `.env` di root repo | Otomatis dibaca `docker compose` |

Variabel yang sudah di-set di environment (systemd, pm2, Docker) selalu menang atas isi file.

## Dari mana setiap key didapat

| Key | Dipakai oleh | Cara membuat / sumber | Catatan |
| --- | --- | --- | --- |
| `POSTGRES_PASSWORD` (+ `POSTGRES_USER`) | backend, csms-ai (`DATABASE_URL`) | Dibuat DBA: `CREATE ROLE hse LOGIN PASSWORD '...';` | Satu user per lingkungan. User butuh hak `CREATE` pada database (skema dibuat otomatis) |
| `BETTER_AUTH_SECRET` | backend | `openssl rand -hex 32` | Berbeda per lingkungan. Mengganti nilainya membuat semua pengguna harus login ulang. Preflight menolak start di produksi bila kosong, `secret`, atau kurang dari 32 karakter |
| `ADMIN_DEFAULT_PASSWORD` (+ email, nama) | `db:init_data` | Ditentukan sendiri | Hanya untuk membuat admin pertama. Ganti password setelah login |
| `BREVO_API_KEY` | backend (email CSMS) | [app.brevo.com](https://app.brevo.com) > SMTP & API > API Keys > Generate a new API key | Opsional. Domain `EMAIL_FROM_ADDRESS` harus diverifikasi di Brevo (Senders & Domains). Boleh diganti penyedia lain dengan mengubah `src/services/csms/email.service.ts` |
| `OPENAI_API_KEY` | csms-ai (cadangan) | [platform.openai.com](https://platform.openai.com) > API keys > Create new secret key | Opsional. Pakai project key dengan batas anggaran |
| `LLM_*_ENDPOINT` | csms-ai | Alamat server model milik sendiri | Lihat [08-LLM.md](08-LLM.md) |
| `SSH_*`, `REMOTE_DB_*` | skrip tunnel developer | Akun SSH server milik sendiri | Hanya untuk `npm run tunnel` di laptop developer. Pakai SSH key, bukan password |

## Backend

| Variabel | Wajib | Bawaan | Fungsi |
| --- | --- | --- | --- |
| `LOG_LEVEL` | ya | - | `trace`, `debug`, `info`, `warn`, `error` |
| `PROTOCOL` | | `http` | Dipakai menyusun URL bila `BASE_URL` kosong |
| `HOST` / `PORT` | | `localhost` / `3000` | Alamat dengar API. Server: `0.0.0.0` dan port sesuai reverse proxy (contoh 5142) |
| `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | ya (kecuali port) | port `5432` | Koneksi database |
| `BETTER_AUTH_SECRET` | ya di produksi | `secret` | Kunci tanda tangan sesi |
| `BETTER_AUTH_URL` | disarankan | - | URL publik tempat `/api/auth` diakses browser |
| `COOKIE_PREFIX` | | `cookie` | Awalan nama cookie. Bedakan per lingkungan di domain yang sama |
| `FRONTEND_URL` | ya | `http://localhost:5153` | URL aplikasi di browser. Dipakai untuk CORS (trusted origin) dan URL berkas `/uploads` di produksi. Tanpa slash akhir |
| `BASE_URL` | disarankan | dihitung | URL publik API |
| `UPLOADS_DIR` | disarankan | `../uploads` | Folder berkas. Path absolut disarankan. **Harus sama dengan csms-ai** |
| `CSMS_AI_SERVICE_URL` | | `http://localhost:8000` | Alamat internal csms-ai |
| `CSMS_AI_JOB_STALE_MINUTES` | | 120 | Job AI yang tidak bergerak selama ini ditandai gagal |
| `BREVO_API_KEY` | | kosong | Kosong = email tidak dikirim |
| `EMAIL_FROM_ADDRESS` / `EMAIL_FROM_NAME` | bila email aktif | `no-reply@example.com` / `HSE Proview No-Reply` | Pengirim email |
| `CHROME_PATH` | | Chromium bawaan Puppeteer | Path Chrome/Chromium untuk export PDF laporan harian |
| `MARINE_HOURS_POB_PHE_OSES`, `MARINE_HOURS_POB_CONTRACTOR` | | - | Jam kerja per POB untuk perhitungan manhours marine |
| `ADMIN_DEFAULT_EMAIL`, `ADMIN_DEFAULT_NAME`, `ADMIN_DEFAULT_PASSWORD` | untuk `db:init_data` | - | Admin awal |
| `EMPLOYEE_DEFAULT_PASSWORD` | | acak | Password awal akun karyawan yang dibuat otomatis bila tanggal lahir kosong. Bila tanggal lahir ada, password awal = tanggal lahir `ddmmyyyy` (aturan bisnis lama; pertimbangkan mewajibkan ganti password saat login pertama) |
| `SKIP_DB_ENSURE` | | `false` | `true` = lewati sinkronisasi skema saat start |
| `SKIP_PREFLIGHT` | | `false` | `true` = lewati pemeriksaan preflight saat start |
| `ENV_FILE` | | `.env`, lalu `.env.devel` | File env yang dibaca |
| `NODE_ENV` | | - | `production` mengaktifkan pemeriksaan ketat (secret, uploads) |

## csms-ai

| Variabel | Wajib | Bawaan | Fungsi |
| --- | --- | --- | --- |
| `DATABASE_URL` | **ya** | - | `postgresql://user:password@host:5432/db?sslmode=disable`. Karakter khusus di password harus di-URL-encode. Proses berhenti bila kosong |
| `UPLOADS_DIR` | ya | `../uploads` | **Sama persis** dengan backend. Relatif terhadap folder csms-ai |
| `CSMS_ENV` | | - | `production` / `development` / `demo`: memilih `.env.<nama>` |
| `CSMS_AI_HOST` / `CSMS_AI_PORT` | | `0.0.0.0` / `8000` | Alamat dengar. Disarankan `127.0.0.1` (hanya diakses backend) |
| `CSMS_AI_CONCURRENCY` | | 1 | Jumlah evaluasi berjalan bersamaan |
| `LLM_REASONING_ENDPOINT` / `_MODEL` | ya untuk AI | `configs/model_roles.json` (localhost) | Model juri |
| `LLM_CONSENSUS_ENDPOINT` / `_MODEL` | ya untuk AI | idem | Model konsensus |
| `LLM_VISION_ENDPOINT` / `_MODEL` | | idem | Model OCR visi; bila mati, OCR memakai PaddleOCR lokal |
| `LLM_TIMEOUT_SECONDS` | | dari JSON | Batas waktu per panggilan LLM |
| `LLM_MAX_PROMPT_CHARS` | | 40000 | Batas panjang prompt |
| `OPENAI_API_KEY` / `OPENAI_FALLBACK_MODEL` | | kosong | Cadangan saat LLM internal gagal |
| `OLLAMA_BASE_URL` / `OLLAMA_EMBED_MODEL` | | localhost | Embedding untuk seed ulang knowledge base |
| `CSMS_AI_JOB_TIMEOUT_MIN`, `CSMS_AI_THOROUGH_JOB_CAP_MIN`, `CSMS_AI_FAST_ELEMENT_MIN` | | 90 / 1440 / 10 | Batas waktu job dan per elemen |
| `CSMS_AI_EVIDENCE_CHARS`, `CSMS_AI_FAST_EVIDENCE_CHARS` | | 34000 / 12000 | Jumlah teks bukti per elemen (mode thorough / fast) |
| `CSMS_AI_OCR_DPI`, `CSMS_AI_OCR_FIRST_PAGES`, `CSMS_AI_OCR_LAST_PAGES`, `CSMS_AI_MIN_PAGE_TEXT` | | 130 / 55 / 5 / 40 | Pengaturan OCR halaman pindaian |
| `CSMS_AI_VISION_PARALLEL`, `CSMS_AI_VISION_TIMEOUT` | | 4 / 60 | Paralelisme dan batas waktu OCR visi |
| `CSMS_AI_ARCHIVE_MAX_FILES`, `CSMS_AI_ARCHIVE_MAX_MB` | | 500 / 1024 | Batas isi arsip ZIP/RAR/7Z |
| `CSMS_AI_EMBED_CHUNKS` | | 0 | 1 = hitung embedding potongan bukti (lebih lambat) |

## Frontend

| Variabel | Wajib | Fungsi |
| --- | --- | --- |
| `VITE_APP_BASE_URL` | ya | URL publik backend tanpa slash akhir. Bila frontend dan backend satu domain (nginx meneruskan `/api`), isi dengan URL aplikasi itu sendiri |
| `VITE_APP_VARIANT` | | `demo` = tampilan SafeView; kosong = HSE Proview |
| `VITE_FEATURE_TUTORIAL` | | `false` mematikan tutorial in-app |
| `VITE_APP_ENV_MODE` | | `release` |

Karena dibaca saat build, mengubah variabel frontend berarti build ulang.

## Aturan yang sering terlewat

1. `UPLOADS_DIR` backend dan csms-ai harus menunjuk folder fisik yang sama. Preflight backend memperingatkan bila berbeda.
2. `FRONTEND_URL`, `BETTER_AUTH_URL`, `BASE_URL`, `VITE_APP_BASE_URL` tanpa slash di akhir, dan memakai skema (`https://`) yang sama dengan yang dibuka pengguna.
3. Bila beberapa lingkungan berjalan di domain yang sama, `COOKIE_PREFIX` harus berbeda agar sesi tidak bertabrakan.
4. Jangan pernah commit file `.env` asli. CI menjalankan gitleaks dan akan gagal bila ada kredensial.
