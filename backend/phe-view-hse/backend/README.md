# Backend (Fastify API) — HSE Proview / SafeView

API untuk seluruh modul (Reporting, CSMS, Pekerja, Notifikasi, Admin). Stack: Node.js (TypeScript, ESM), Fastify, Drizzle ORM, Better Auth, PostgreSQL. Penilaian AI CSMS dikerjakan service Python terpisah: [`csms-ai/`](csms-ai/readme.md).

Panduan ini untuk **menjalankan lokal dan deploy**. Langkah demo lengkap (SafeView, server `phe`): [`docs/safeview-demo/DEPLOY_DEMO.md`](../../../docs/safeview-demo/DEPLOY_DEMO.md).

## 1. Peta sistem

```
Browser ──► Frontend (static, nginx) ──► Backend :PORT ──► PostgreSQL
                                             │
                                             └──► csms-ai :8000/8001/8002 ──► PostgreSQL (DB yang sama)
                                                      │                    └─► vLLM / OpenAI (LLM), qwen3-vl (OCR)
                                                      └── membaca berkas dari UPLOADS_DIR (harus sama dengan backend)
```

| Komponen | Dev | Prod | Demo |
|---|---|---|---|
| Backend | `PORT` di `.env` (bawaan 3000) | sesuai `.env` server | 5181 |
| csms-ai | 8000 | 8001 | 8002 (hanya `127.0.0.1`) |
| Database | sesuai `.env` | sesuai `.env` | `safeview_hse_demo` |

Kode yang sama dipakai semua environment; yang berbeda hanya **file env** (lihat §3).

## 2. Prasyarat

- Node.js ≥ 22 dan npm. Untuk skrip `dev*` dan `db:init_data*` dipakai [bun](https://bun.sh).
- PostgreSQL 16/17 dengan ekstensi `ltree`, `vector` (pgvector), `pgcrypto`, `uuid-ossp`.
- pm2 di server (`npm i -g pm2`).
- Chrome/Chromium untuk ekspor PDF (`CHROME_PATH`, bila tidak memakai Chromium bawaan paket).
- csms-ai berjalan dan satu DB dengan backend (untuk fitur Evaluasi AI).

## 3. Konfigurasi (env)

Backend membaca satu file env: `ENV_FILE` bila di-set, kalau tidak `.env`, kalau tidak ada `.env.devel`. Template tanpa rahasia: `.env.demo.example`. **File `.env*` asli tidak pernah di-commit** (di-ignore). Jangan menaruh password, API key, atau token di file `*.example`.

| Variabel | Wajib | Keterangan |
|---|:-:|---|
| `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | ya | Koneksi database (port bawaan 5432) |
| `LOG_LEVEL` | ya | `trace` / `debug` / `info` / `warn` / `error` |
| `HOST`, `PORT`, `PROTOCOL` | | Alamat listen (bawaan `localhost:3000`, `http`). Di server pakai `HOST=0.0.0.0` |
| `BETTER_AUTH_SECRET` | ya (prod) | Acak 64 hex: `openssl rand -hex 32`. Bawaan kode `secret` **tidak boleh dipakai** di server |
| `BETTER_AUTH_URL` | ya (server) | URL backend yang dibuka browser, persis, tanpa slash akhir |
| `FRONTEND_URL` | ya (server) | URL frontend, persis seperti di address bar (dipakai CORS, cookie, dan membentuk URL berkas `<FRONTEND_URL>/uploads/...` di mode produksi) |
| `BASE_URL` | | URL publik backend (bawaan diturunkan dari `FRONTEND_URL`) |
| `COOKIE_PREFIX` | | Beda per environment agar cookie tidak bentrok (mis. `safeview_demo`) |
| `UPLOADS_DIR` | ya (server) | Path **absolut** folder upload. Harus **sama persis** dengan `UPLOADS_DIR` csms-ai |
| `CSMS_AI_SERVICE_URL` | ya | URL csms-ai, mis. `http://127.0.0.1:8002` (bawaan `http://localhost:8000`) |
| `CSMS_AI_JOB_STALE_MINUTES` | | Job evaluasi AI yang menggantung dianggap kedaluwarsa (bawaan 120) |
| `BREVO_API_KEY` | | Kosongkan di demo agar tidak pernah mengirim email |
| `CHROME_PATH` | | Path Chrome untuk ekspor PDF |
| `MARINE_HOURS_POB_PHE_OSES`, `MARINE_HOURS_POB_CONTRACTOR` | | Parameter perhitungan jam kerja marine |
| `SKIP_DB_ENSURE=true` atau `AUTO_ENSURE_SCHEMA=false` | | Melewati sinkronisasi skema saat start (lihat §5). Jangan dipakai di server biasa |
| `ADMIN_DEFAULT_EMAIL`, `ADMIN_DEFAULT_NAME`, `ADMIN_DEFAULT_PASSWORD` | hanya `db:init_data` | Akun admin awal untuk database kosong |

## 4. Menjalankan lokal

```bash
cd backend/phe-view-hse/backend
npm ci
cp .env.demo.example .env          # isi nilai sebenarnya (file ini di-ignore git)
npm run dev                        # bun --watch, log berwarna
# atau tanpa bun:
ENV_FILE=.env NODE_ENV=development npx tsx src/server.ts
```

Boot pertama sekitar 40 detik (sinkronisasi skema, pengecekan alarm, job cuaca dan jam kerja). Server siap bila log menampilkan `Server listening on ...`.

- Dokumentasi API (Scalar): `http://<host>:<port>/api/docs`
- Cek hidup: `GET /api/public/server-info` (uptime, memori, versi Node)
- Typecheck: `npx tsc --noEmit -p .`

## 5. Database

- **Skema dibuat dan disinkronkan otomatis** setiap server start (`src/db/ensure/`, lihat [README-nya](src/db/ensure/README.md)). Hanya aditif dan idempoten: tidak pernah `DROP`, `TRUNCATE`, atau `DELETE`. Aman dijalankan berulang dan di banyak proses pm2 (advisory lock).
- **Jangan menjalankan `db:migrate` / `db:push` di server demo/prod.** Tabel migrasi sengaja kosong; skema dipelihara oleh *auto-ensure*.
- Database kosong butuh ekstensi (buat sekali sebagai superuser):
  ```bash
  sudo -u postgres createdb <NAMA_DB>
  sudo -u postgres psql -d <NAMA_DB> -c 'CREATE EXTENSION IF NOT EXISTS ltree; CREATE EXTENSION IF NOT EXISTS vector; CREATE EXTENSION IF NOT EXISTS pgcrypto; CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
  ```
- Data awal:
  - Akun admin pertama: isi `ADMIN_DEFAULT_*` lalu `npm run db:init_data` (prod) / `db:init_data_dev`.
  - Data sintetis untuk demo/dev: [`docs/INSTALL_DUMMY_DATABASE.md`](../../../docs/INSTALL_DUMMY_DATABASE.md).
- Backup sebelum update: `pg_dump -Fc <NAMA_DB> > backups/db_$(date +%F).dump`.

## 6. Build dan deploy

Build di laptop, kirim hasilnya, jalankan dengan pm2:

```bash
npm ci
npm run build                      # hasil di ./dist (termasuk src/locales)
```

Perintah kirim yang sudah dipakai:

```bash
# Production  — https://<DOMAIN_APP>
scp -r -P <SSH_PORT> ./dist/* package.json package-lock.json <SSH_USER>@<IP_SERVER>:/srv/hse-proview/backend

# Development — http://<IP_SERVER>:5153
scp -r -P <SSH_PORT> ./dist/* package.json package-lock.json <SSH_USER>@<IP_SERVER>:/srv/hse-proview-dev/backend
```

Di server (sekali per update):

```bash
cd <folder backend di server>
npm ci --omit=dev
ENV_FILE=.env NODE_ENV=production pm2 start src/server.js --name <nama-app> --update-env   # pertama kali
pm2 restart <nama-app> --update-env                                                          # update berikutnya
pm2 save
pm2 logs <nama-app> --lines 40     # tunggu "Server listening on 0.0.0.0:<PORT>"
```

Demo SafeView memakai `ENV_FILE=.env.demo` dan nama app `safeview-demo-backend` (`npm run start:demo`), lengkap di DEPLOY_DEMO.md.

### Urutan deploy (semua bagian)

1. Database: buat, ekstensi, restore atau biarkan *auto-ensure* membuat skema.
2. Folder uploads (`UPLOADS_DIR`) dan izin tulis untuk user pm2.
3. **csms-ai** (service Python, [`csms-ai/readme.md`](csms-ai/readme.md)), cek `GET /health`.
4. **Backend** (halaman ini), cek `GET /api/public/server-info`.
5. **Frontend** ([README frontend](../../../frontend/phe-view-hse/README.md)), build lalu salin ke folder nginx.
6. Smoke test (§8).

## 7. Perilaku saat start dan pemeriksaan kesehatan

Yang terjadi sekarang (sudah diuji):

| Kondisi | Hasil |
|---|---|
| Database tidak terjangkau (auto-ensure aktif) | Backend **berhenti saat start** dengan `AggregateError [ECONNREFUSED]`. Pesan tidak menyebut host/DB yang dituju. Cek `POSTGRES_*` dan `pg_isready` |
| Variabel wajib kosong (`POSTGRES_*`, `LOG_LEVEL`) | Berhenti dengan pesan skema env |
| `SKIP_DB_ENSURE=true` dan DB mati | Tidak ada pengecekan di awal; berhenti kemudian oleh job alarm dengan error query panjang |
| DB hidup tetapi csms-ai mati | Backend tetap start. Hanya Evaluasi AI yang gagal: HTTP 503 "CSMS-AI Engine is offline" |
| Sudah berjalan | `/api/public/server-info` hanya menunjukkan proses hidup, **tidak** memeriksa database |

Cek manual:

```bash
pg_isready -h <POSTGRES_HOST> -p <POSTGRES_PORT>
psql "postgresql://<USER>@<HOST>:<PORT>/<DB>" -c "select 1"
curl -s http://127.0.0.1:<PORT>/api/public/server-info
curl -s http://127.0.0.1:<PORT_CSMS_AI>/health      # {"status":"ok","rar":true,"vision":true}
```

Setelah login admin, halaman Evaluasi AI menampilkan status engine (`GET /api/v1/user/csms/contract/folder/evaluate/engine-health`).

## 8. Smoke test setelah deploy

| # | Langkah | Harapan |
|---|---|---|
| 1 | `curl .../api/public/server-info` | JSON uptime |
| 2 | Buka frontend, login | Dashboard terbuka, tidak langsung logout |
| 3 | DevTools → Network | API hanya ke URL backend yang benar |
| 4 | Buka dokumen CSMS atau foto pegawai | Berkas termuat (UPLOADS_DIR benar) |
| 5 | CSMS → kontrak → Evaluasi AI → pilih mode | Job berjalan, progres tampil |
| 6 | Hentikan csms-ai lalu Evaluasi AI | Pesan engine offline, bukan skor palsu |

## 9. Troubleshooting

| Gejala | Penyebab umum |
|---|---|
| Login lalu langsung logout / CORS | `FRONTEND_URL` dan `BETTER_AUTH_URL` tidak persis sama dengan URL yang dibuka (slash akhir, http vs https); `COOKIE_PREFIX` sama dengan environment lain |
| Gambar/dokumen 404 | `UPLOADS_DIR` bukan path absolut, tidak ada, atau beda dengan csms-ai. Di mode produksi URL berkas adalah `<FRONTEND_URL>/uploads/...`: nginx frontend harus meneruskan `/uploads/` ke backend (lihat README frontend) |
| Evaluasi AI 503 | csms-ai mati atau `CSMS_AI_SERVICE_URL` salah |
| Evaluasi AI 409 terus | Job lama menggantung: `select id,status,created_at from csms_ai_evaluation_job where status in ('queued','processing');` (job > 120 menit ditutup otomatis; csms-ai melanjutkan job `processing` saat start) |
| Log `Another instance is currently synchronizing schema. Skipping` | Normal pada pm2 cluster: hanya satu proses yang menyinkronkan skema, yang lain melewatinya |
| Notifikasi realtime tidak muncul | `pm2 logs <app> | grep "Listening on channel"`; listener reconnect otomatis bila Postgres restart |
| Ekspor PDF gagal | `CHROME_PATH` belum di-set atau Chrome tidak terpasang |

## 10. Keamanan

- Jangan commit `.env*` asli, password server/DB, atau API key. Dokumentasi memakai placeholder `<...>`.
- `BETTER_AUTH_SECRET` berbeda per environment.
- Port csms-ai hanya di `127.0.0.1`; jangan dibuka ke publik.
