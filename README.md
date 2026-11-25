# HSE Proview / SafeView — fullstack

Satu repo untuk semua bagian aplikasi.

> **Serah terima:** mulai dari [docs/handover/README.md](docs/handover/README.md) (arsitektur, konfigurasi, deploy Docker/server, database, operasional, akses dan kredensial).

Mulai cepat dengan Docker:

```bash
cp .env.docker.example .env      # isi nilai <...>
docker compose up -d --build
docker compose run --rm backend node src/scripts/init-data.js
```

Isi repo:

| Folder | Isi |
|---|---|
| `frontend/phe-view-hse` | React + Vite SPA (bun) |
| `backend/phe-view-hse/backend` | Fastify API + `csms-ai/` (FastAPI, penilaian AI CSMS) |
| `docs/` | dokumentasi, data sintetis demo, `docs/safeview-demo/` (plan + deploy demo) |

## Satu kode, tiga environment

| Env | Frontend | Backend | csms-ai |
|---|---|---|---|
| prod / dev | `bun run build` (PO-View) | `.env` | `.env.production` / `.env.development` |
| **demo (SafeView)** | `bun run build:demo` (`.env.demo`) | `ENV_FILE=.env.demo` (`npm run start:demo`) | `ENV_FILE=.env.demo` (pm2 `csms-ai-demo`, port 8002) |

Demo hanya berbeda pada: **logo/nama, database `safeview_hse_demo`, folder `uploads_demo`** (plus port). Template env: `.env.example` dan `.env.*.example` (tanpa rahasia, berisi sumber tiap key). File `.env*` asli tidak pernah di-commit.

## Panduan per bagian

| Bagian | README |
|---|---|
| Frontend (build, nginx, tutorial/PDF) | [frontend/phe-view-hse/README.md](frontend/phe-view-hse/README.md) |
| Backend (env, database, deploy, pemeriksaan kesehatan) | [backend/phe-view-hse/backend/README.md](backend/phe-view-hse/backend/README.md) |
| csms-ai (AI CSMS: cara kerja, env, endpoint, deploy) | [backend/phe-view-hse/backend/csms-ai/readme.md](backend/phe-view-hse/backend/csms-ai/readme.md) |
| Uji Cypress | [frontend/phe-view-hse/cypress/README.md](frontend/phe-view-hse/cypress/README.md) |

Urutan deploy: database → uploads → csms-ai → backend → frontend → smoke test.

Panduan deploy: [docs/handover/03-DEPLOY-DOCKER.md](docs/handover/03-DEPLOY-DOCKER.md) (Docker) dan [docs/handover/04-DEPLOY-SERVER.md](docs/handover/04-DEPLOY-SERVER.md) (pm2 + nginx). Catatan pengembangan lama: [docs/safeview-demo/](docs/safeview-demo/).
