# 03. Deploy dengan Docker Compose

Cara paling sederhana memasang HSE Proview di server mana pun (on-premise, VM cloud, Kubernetes via konversi). Semua komponen kecuali server LLM berjalan sebagai container.

| Service | Image | Port | Data |
| --- | --- | --- | --- |
| `db` | `pgvector/pgvector:pg17` | tidak dibuka ke luar | volume `pgdata` |
| `backend` | dibangun dari `backend/phe-view-hse/backend/Dockerfile` | internal 5142 | volume `uploads` |
| `csms-ai` | dibangun dari `backend/phe-view-hse/backend/csms-ai/Dockerfile` | internal 8001 | volume `uploads` (sama) |
| `frontend` | dibangun dari `frontend/phe-view-hse/Dockerfile` (nginx) | `HTTP_PORT` (bawaan 8080) | - |

nginx di container `frontend` menyajikan aplikasi dan meneruskan `/api/` (termasuk WebSocket) dan `/uploads/` ke backend, sehingga browser hanya membuka satu alamat.

## Prasyarat

- Docker Engine 24+ dengan plugin Compose v2.
- Disk: sekitar 8 GB untuk image (csms-ai sekitar 5 GB karena PaddleOCR/OpenCV) ditambah data dan uploads.
- RAM: minimal 4 GB; csms-ai bisa memakai hingga 4 GB saat OCR dokumen besar.
- Server LLM yang bisa dijangkau dari host Docker (lihat [08-LLM.md](08-LLM.md)). Tanpa LLM, aplikasi tetap berjalan, hanya Evaluasi AI CSMS yang tidak tersedia.
- TLS: pasang di reverse proxy atau load balancer di depan port `HTTP_PORT`.

## Instalasi langkah demi langkah

Image Docker tidak ikut diserahkan; image dibangun sendiri oleh tim penerima dari `Dockerfile` di repo pada langkah 3.

0. Pasang Docker di server (sekali). Contoh Ubuntu/Debian:

   ```bash
   curl -fsSL https://get.docker.com | sudo sh
   sudo usermod -aG docker $USER      # keluar lalu login ulang agar berlaku
   docker --version && docker compose version
   ```

1. Ambil kode dan siapkan konfigurasi.

   ```bash
   git clone <URL_REPO> hse-proview && cd hse-proview
   cp .env.docker.example .env
   ```

2. Isi `.env`. Minimal: `APP_URL` (URL yang dibuka pengguna, tanpa slash akhir), `POSTGRES_PASSWORD`, `BETTER_AUTH_SECRET` (`openssl rand -hex 32`), `ADMIN_DEFAULT_*`, dan `LLM_*_ENDPOINT`. Arti tiap variabel: [02-KONFIGURASI.md](02-KONFIGURASI.md).

3. Bangun dan jalankan.

   ```bash
   docker compose up -d --build
   docker compose ps          # tunggu backend dan csms-ai "healthy"
   ```

   Saat start pertama, backend membuat seluruh tabel (sinkronisasi skema), lalu csms-ai membuat tabel rubric dan memuat rubric bawaan.

4. Buat admin pertama (sekali saja).

   ```bash
   docker compose run --rm backend node src/scripts/init-data.js
   ```

5. Periksa semuanya sehat.

   ```bash
   curl -f "$APP_URL/api/public/health"                 # {"status":"ok",...}
   docker compose exec csms-ai python -m server.preflight   # [preflight] SIAP
   ```

6. Buka `APP_URL`, login dengan `ADMIN_DEFAULT_EMAIL` / `ADMIN_DEFAULT_PASSWORD`, lalu ganti password admin.

## Memindahkan data dari server lama

Gunakan berkas dari [scripts/backup-server.sh](scripts/backup-server.sh): `<db>_<tanggal>.sql.gz` dan `uploads_<db>_<tanggal>.tar.gz`.

```bash
# 1. Jalankan hanya database
docker compose up -d db

# 2. Restore dump ke database yang masih kosong
gunzip -c pheview_hse_2026-11-25.sql.gz | docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1

# 3. Salin uploads ke volume (isi arsip adalah satu folder, mis. "uploads/")
docker compose run --rm --no-deps -v "$PWD:/backup" --entrypoint sh backend \
  -c 'mkdir -p /tmp/u && tar -xzf /backup/uploads_pheview_hse_2026-11-25.tar.gz -C /tmp/u && cp -a /tmp/u/*/. /data/uploads/'

# 4. Jalankan semuanya. Backend menyesuaikan skema bila perlu (tidak menghapus data).
docker compose up -d
```

Jangan menjalankan `init-data` setelah restore; akun lama ikut di dump. Variabel `$POSTGRES_USER`/`$POSTGRES_DB` di atas diambil dari `.env` (jalankan `set -a; . ./.env; set +a` dulu).

## Operasi harian

| Keperluan | Perintah |
| --- | --- |
| Status dan health | `docker compose ps`, `curl -f $APP_URL/api/public/health` |
| Log | `docker compose logs -f backend` (atau `csms-ai`, `frontend`, `db`) |
| Preflight manual | `docker compose exec backend node src/scripts/preflight.js` dan `docker compose exec csms-ai python -m server.preflight` |
| Update versi | `git pull && docker compose up -d --build` |
| Backup DB | `docker compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner \| gzip > db_$(date +%F).sql.gz` |
| Backup uploads | `docker run --rm -v hse-proview_uploads:/u -v "$PWD:/b" alpine tar -czf /b/uploads_$(date +%F).tar.gz -C /u .` |
| Berhenti | `docker compose down` (data tetap di volume; `down -v` MENGHAPUS data) |

## Catatan

- Variabel `VITE_*` frontend ditanam saat build. Mengubah `APP_URL` berarti `docker compose up -d --build frontend`.
- LLM di host yang sama dengan Docker: pakai `http://host.docker.internal:<port>/v1` (Docker Desktop) atau IP host di jaringan bridge (Linux, tambahkan `extra_hosts: ["host.docker.internal:host-gateway"]` pada service `csms-ai`).
- Untuk memakai PostgreSQL terkelola (bukan container `db`), hapus service `db`, ubah `POSTGRES_HOST` backend dan `DATABASE_URL` csms-ai ke host DB tersebut, dan pastikan ekstensi `ltree`, `uuid-ossp`, `pgcrypto`, `vector` tersedia.
- Untuk penyimpanan uploads di luar disk host (NFS, S3 lewat s3fs/rclone mount), ganti volume `uploads` dengan bind mount ke folder mount tersebut. Kedua service harus memakai mount yang sama.
