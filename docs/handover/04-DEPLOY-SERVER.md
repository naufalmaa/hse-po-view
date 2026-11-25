# 04. Deploy langsung di server Linux (tanpa Docker)

Cara ini sama dengan cara aplikasi berjalan di server saat serah terima: Node.js + pm2 untuk backend, Python virtualenv + pm2 untuk csms-ai, nginx untuk frontend statis dan reverse proxy. Semua alamat, nama user, dan path di bawah adalah contoh; ganti sesuai server Anda.

Contoh tata letak folder:

```
/srv/hse-proview/
  backend/        hasil build backend (dist) + package.json + .env
  backend/csms-ai/  kode csms-ai + .venv + .env.production
  frontend/       hasil build frontend (dist)
  uploads/        UPLOADS_DIR (dipakai backend DAN csms-ai)
  backups/
```

## 1. Prasyarat server

| Perangkat lunak | Versi | Catatan |
| --- | --- | --- |
| OS | Ubuntu 22.04/24.04 atau Debian 12 | Distro lain bisa, sesuaikan nama paket |
| Node.js | 22 LTS | Dengan npm. `npm i -g pm2` |
| Python | 3.10 atau 3.11 | Dengan `python3-venv` |
| PostgreSQL | 16+ | Bisa di server lain. Paket `postgresql-16-pgvector` untuk ekstensi `vector` |
| nginx | 1.18+ | Atau reverse proxy lain |
| Chromium | - | `apt install chromium` (export PDF). Isi `CHROME_PATH` |
| Pustaka sistem csms-ai | - | `apt install libgl1 libglib2.0-0 libgomp1 unar poppler-utils` |

```bash
sudo apt update
sudo apt install -y nginx chromium libgl1 libglib2.0-0 libgomp1 unar poppler-utils python3-venv
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
sudo npm i -g pm2
```

## 2. Database

```sql
-- sebagai superuser PostgreSQL
CREATE ROLE hse LOGIN PASSWORD '<DB_PASSWORD>';
CREATE DATABASE pheview_hse OWNER hse;
\c pheview_hse
CREATE EXTENSION IF NOT EXISTS ltree;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;
```

Membuat ekstensi butuh superuser; setelah itu user aplikasi cukup menjadi owner database. Tabel dibuat otomatis oleh backend saat start pertama. Untuk memulihkan data lama, lihat [05-DATABASE.md](05-DATABASE.md#restore).

## 3. Backend

Di mesin build (laptop atau CI):

```bash
cd backend/phe-view-hse/backend
npm ci
npm run build                    # hasil di ./dist (termasuk src/locales)
```

Kirim `dist/*`, `package.json`, `package-lock.json`, dan `.npmrc` ke `/srv/hse-proview/backend/`. Di server:

```bash
cd /srv/hse-proview/backend
cp <template>/.env.example .env  # isi nilai <...>, lihat 02-KONFIGURASI.md
npm ci --omit=dev
ENV_FILE=.env NODE_ENV=production node src/scripts/preflight.js   # harus "SIAP" (WARN csms-ai wajar bila belum jalan)
ENV_FILE=.env NODE_ENV=production pm2 start src/server.js --name hse-backend --update-env
pm2 logs hse-backend --lines 40   # tunggu "Server listening on 0.0.0.0:<PORT>"
ENV_FILE=.env node src/scripts/init-data.js                       # admin pertama (sekali, hanya untuk DB baru)
```

## 4. csms-ai

```bash
cd /srv/hse-proview/backend/csms-ai      # salin folder csms-ai dari repo
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.production.example .env.production   # isi DATABASE_URL, UPLOADS_DIR (= backend), LLM_*
ENV_FILE=.env.production .venv/bin/python -m server.preflight   # harus "SIAP"
pm2 start ecosystem.config.cjs --only csms-ai-prod
pm2 save && pm2 startup                         # jalankan otomatis saat server reboot
```

`ecosystem.config.cjs` berisi tiga app (`csms-ai-dev` port 8000, `csms-ai-prod` 8001, `csms-ai-demo` 8002) dan otomatis memakai `.venv`.

## 5. Frontend

Di mesin build:

```bash
cd frontend/phe-view-hse
cp .env.example .env          # VITE_APP_BASE_URL = URL publik (tanpa slash akhir)
npm ci
npm run build                 # hasil di ./dist; varian SafeView: npm run build:demo
```

Kirim isi `dist/` ke `/srv/hse-proview/frontend/`.

## 6. nginx

Satu domain untuk frontend dan API (disarankan; cookie dan CORS paling sederhana):

```nginx
server {
    listen 443 ssl http2;
    server_name <DOMAIN_APP>;
    ssl_certificate     /etc/ssl/<DOMAIN_APP>/fullchain.pem;
    ssl_certificate_key /etc/ssl/<DOMAIN_APP>/privkey.pem;

    root /srv/hse-proview/frontend;
    index index.html;
    client_max_body_size 1024m;

    location /api/ {
        proxy_pass http://127.0.0.1:5142;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;     # WebSocket notifikasi
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 600s;
    }
    location /uploads/ { proxy_pass http://127.0.0.1:5142; }
    location /assets/  { expires 30d; add_header Cache-Control "public, immutable"; }
    location /         { try_files $uri $uri/ /index.html; }   # tanpa ini, refresh halaman = 404
}
```

Dengan pola ini: `FRONTEND_URL` = `BASE_URL` = `BETTER_AUTH_URL` = `VITE_APP_BASE_URL` = `https://<DOMAIN_APP>`.

Bila API di domain terpisah, buat server block kedua untuk `<DOMAIN_API>` yang meneruskan semua path ke backend, isi `BASE_URL`/`BETTER_AUTH_URL`/`VITE_APP_BASE_URL` dengan domain API, dan tetap teruskan `/uploads/` dari domain frontend ke backend (URL berkas dibentuk dari `FRONTEND_URL`).

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 7. Pemeriksaan setelah deploy

1. `curl -f https://<DOMAIN_APP>/api/public/health` menjawab `{"status":"ok", ...}`.
2. `curl -f http://127.0.0.1:8001/health` (di server) menjawab `"db": true`.
3. Buka aplikasi, login, buka satu laporan harian dan satu dokumen CSMS (gambar/berkas tampil).
4. Jalankan Evaluasi AI pada satu folder CSMS kecil; progres tampil dan selesai.

## Alternatif pm2: systemd

```ini
# /etc/systemd/system/hse-backend.service
[Unit]
Description=HSE Proview backend
After=network.target

[Service]
WorkingDirectory=/srv/hse-proview/backend
Environment=NODE_ENV=production ENV_FILE=.env
ExecStart=/usr/bin/node src/server.js
Restart=always
User=hse

[Install]
WantedBy=multi-user.target
```

Buat file serupa untuk csms-ai dengan `WorkingDirectory=/srv/hse-proview/backend/csms-ai`, `Environment=ENV_FILE=.env.production`, dan `ExecStart=/srv/hse-proview/backend/csms-ai/.venv/bin/python -m server.main`. Lalu `sudo systemctl enable --now hse-backend hse-csms-ai`.

## Lingkungan demo (SafeView) di server yang sama

Ulangi langkah 3 sampai 6 dengan: database `safeview_hse_demo`, folder `/srv/hse-proview-demo`, `ENV_FILE=.env.demo` (backend port 5181), pm2 app `csms-ai-demo` (port 8002), `npm run build:demo` (frontend), dan `COOKIE_PREFIX` berbeda. Ganti password akun demo dengan `docs/safeview-demo/set_demo_passwords.mjs` (password acak per akun). Panduan lama yang lebih rinci: `docs/safeview-demo/DEPLOY_DEMO.md`.
