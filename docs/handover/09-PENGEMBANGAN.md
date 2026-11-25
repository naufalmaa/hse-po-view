# 09. Pengembangan

## Setup lokal

Prasyarat: Node.js 22, Bun 1.x (dipakai `npm run dev` backend dan `db:init_data_dev`), Python 3.10/3.11, PostgreSQL 16+ dengan pgvector. Tanpa Bun, backend bisa dijalankan dengan `ENV_FILE=.env NODE_ENV=development npx tsx src/server.ts`.

```bash
# 1. Database kosong
createdb pheview_hse_devel

# 2. Backend (http://127.0.0.1:3000)
cd backend/phe-view-hse/backend
cp .env.example .env        # POSTGRES_DB=pheview_hse_devel, HOST=127.0.0.1, PORT=3000, UPLOADS_DIR=../uploads
npm ci
npm run dev                 # skema dibuat otomatis saat start
npm run db:init_data_dev    # admin pertama

# 3. csms-ai (http://127.0.0.1:8000)
cd csms-ai
python -m venv .venv && .venv/bin/pip install -r requirements.txt      # Windows: .venv\Scripts\pip
cp .env.development.example .env.development                            # DATABASE_URL ke pheview_hse_devel
CSMS_ENV=development .venv/bin/python -m server.main

# 4. Frontend (http://localhost:5173)
cd frontend/phe-view-hse
cp .env.example .env        # VITE_APP_BASE_URL=http://127.0.0.1:3000
npm ci
npm run dev
```

Untuk data contoh, muat data sintetis (lihat [05-DATABASE.md](05-DATABASE.md#data-demo)).

## Struktur repo

| Path | Isi |
| --- | --- |
| `frontend/phe-view-hse/src/routes` | Halaman (TanStack Router, berbasis file; `routeTree.gen.ts` dibuat otomatis) |
| `frontend/phe-view-hse/src/components/pages` | Komponen per modul |
| `frontend/phe-view-hse/src/service` | Pemanggilan API (TanStack Query) |
| `frontend/phe-view-hse/src/locales` | Teks ID/EN |
| `backend/.../src/routes` | Endpoint (autoload: struktur folder = URL). `v1/admin`, `v1/user`, `v1/employee`, `public`, `auth` |
| `backend/.../src/services` | Logika bisnis; aturan murni yang diuji ada di file `*.rules.ts` |
| `backend/.../src/db/schema` | Drizzle schema (definisi tipe query) |
| `backend/.../src/db/ensure` | DDL idempoten yang dijalankan saat start |
| `backend/.../src/jobs`, `src/scheduler` | Job dan jadwal cron |
| `backend/.../src/scripts` | Skrip utilitas (init-data, preflight, dump-schema, tunnel, perbaikan data) |
| `backend/.../csms-ai` | Layanan AI (lihat [06-MODUL-APLIKASI.md](06-MODUL-APLIKASI.md)) |
| `docs/handover` | Dokumen serah terima ini |
| `docs/safeview-demo` | Rencana, laporan, dan panduan kalibrasi AI dari masa pengembangan |
| `docs/demo_data` | Generator dan dump data sintetis |

## Tes

| Bagian | Perintah | Isi |
| --- | --- | --- |
| Backend | `npx tsc -p tsconfig.json --noEmit` | Typecheck |
| Backend | `npx tsx --test test/csms-definalize-copy.test.ts` | Unit test aturan CSMS (31 tes) |
| csms-ai | `python -m unittest tests.test_rubric tests.test_scoring_rules tests.test_llm_failure tests.test_extraction` | Rubric, aturan skor, kegagalan LLM, ekstraksi (butuh `DATABASE_URL` terisi, nilai apa saja) |
| Frontend | `npx vite build && npx tsc --noEmit -p tsconfig.json` | Build + typecheck |
| Frontend | `node --test src/components/pages/csms/contract-management/contract-details/__tests__/copy-drop-utils.test.mts` | Unit test |
| End-to-end | `npm run cy:ai` (frontend) | Cypress untuk CSMS AI; butuh DB uji dan layanan berjalan, lihat `frontend/phe-view-hse/cypress/README.md` |

## CI

`.github/workflows/ci.yml` berjalan di setiap push ke `main`/`handover` dan setiap pull request:

| Job | Gagal bila |
| --- | --- |
| Pindai kredensial (gitleaks) | Ada password/API key/secret di repo. Aturan dan pengecualian placeholder: `.gitleaks.toml` |
| Backend | Error tipe atau unit test gagal |
| schema.sql sama dengan kode | `docs/handover/database/schema.sql` tidak sesuai hasil `ensure` di PostgreSQL 17 |
| csms-ai | Unit test gagal |
| Frontend | Build, typecheck, atau unit test gagal |

Disarankan memasang gitleaks juga sebagai hook lokal: `gitleaks protect --staged --config .gitleaks.toml` di `.git/hooks/pre-commit`.

## Konvensi

- Perubahan skema: ikuti langkah di [05-DATABASE.md](05-DATABASE.md#saat-menambah-atau-mengubah-tabel). Jangan `DROP` di modul `ensure`.
- Rahasia hanya di file env yang diabaikan git. Tambahkan variabel baru ke `.env.example` beserta sumber nilainya, dan ke [02-KONFIGURASI.md](02-KONFIGURASI.md).
- Lint/format backend: `npm run lint`, `npm run format` (Biome).
- `package-lock.json` backend dan frontend di-commit; pakai `npm ci` agar versi dependensi sama persis. Backend memakai `legacy-peer-deps` (`.npmrc`) karena `better-auth` meminta peer `drizzle-orm` versi lebih baru dari yang dipakai.

## Perubahan dari pengembangan yang perlu diketahui

- Skrip di `src/scripts/` selain `init-data`, `preflight`, `dump-schema`, dan tunnel adalah skrip perbaikan/pemeriksaan data sekali pakai dari masa pengembangan. Baca isinya sebelum menjalankan; beberapa mengubah data.
- Notebook di `csms-ai/notebook*` adalah jejak riset model, tidak dipakai saat produksi.
