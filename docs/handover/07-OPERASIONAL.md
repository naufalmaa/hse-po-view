# 07. Operasional

## Health check dan preflight

| Pemeriksaan | Perintah | Hasil sehat |
| --- | --- | --- |
| Backend | `curl -f https://<DOMAIN_APP>/api/public/health` | HTTP 200, `{"status":"ok","checks":{"db":true,"uploads":true,"csmsAi":true}}` |
| csms-ai (dari server) | `curl -f http://127.0.0.1:8001/health` | HTTP 200, `"db": true`, `"llm": true` |
| Preflight backend | `ENV_FILE=.env NODE_ENV=production node src/scripts/preflight.js` | `[preflight] SIAP` |
| Preflight csms-ai | `ENV_FILE=.env.production .venv/bin/python -m server.preflight` | `[preflight] SIAP` |

`/api/public/health` menjawab 503 bila DB atau folder uploads bermasalah; `csmsAi: false` hanya informasi (aplikasi tetap jalan, Evaluasi AI tidak). Endpoint ini cocok untuk monitor uptime, load balancer, atau healthcheck Docker. Hasil uploads dan csms-ai di-cache 30 detik.

Backend juga menjalankan preflight setiap start dan berhenti dengan pesan jelas bila pemeriksaan wajib gagal (DB tidak terjangkau, folder uploads tidak bisa ditulis, `BETTER_AUTH_SECRET` lemah di produksi, ekstensi wajib tidak ada).

## Log

| Komponen | pm2 | Docker |
| --- | --- | --- |
| Backend | `pm2 logs hse-backend` | `docker compose logs -f backend` |
| csms-ai | `pm2 logs csms-ai-prod` | `docker compose logs -f csms-ai` |
| nginx | `/var/log/nginx/` | `docker compose logs -f frontend` |

Backend menulis log JSON (pino). Pasang `pm2 install pm2-logrotate` di server pm2 agar log tidak memenuhi disk.

## Jadwal backup yang disarankan

| Apa | Kapan | Simpan |
| --- | --- | --- |
| Database + uploads (`scripts/backup-server.sh`) | Harian, di luar jam kerja | 7 harian, 4 mingguan, 12 bulanan |
| Uji restore ke DB sementara | Bulanan | - |

Contoh cron di server (salin `docs/handover/scripts/backup-server.sh` ke `/srv/hse-proview/scripts/`):

```cron
30 1 * * * bash /srv/hse-proview/scripts/backup-server.sh /srv/hse-proview/backend/.env /srv/hse-proview/backups >> /var/log/hse-backup.log 2>&1
```

Salin berkas backup ke lokasi lain (NAS/object storage); backup di disk yang sama dengan aplikasi tidak melindungi dari kerusakan disk.

## Update versi

1. Backup database dan uploads.
2. Build backend dan frontend baru (lihat [04-DEPLOY-SERVER.md](04-DEPLOY-SERVER.md)) atau `git pull` (Docker).
3. Backend: kirim `dist`, `npm ci --omit=dev`, preflight, `pm2 restart hse-backend --update-env`. Skema disesuaikan otomatis saat start.
4. csms-ai: salin kode, `.venv/bin/pip install -r requirements.txt` bila requirements berubah, `pm2 restart csms-ai-prod`. Cek versi yang berjalan: `curl -s http://127.0.0.1:8001/health`.
5. Frontend: ganti isi folder frontend dengan `dist` baru. Simpan `dist` lama untuk rollback.
6. Jalankan pemeriksaan di bagian Health check.

Rollback: kembalikan `dist`/kode versi sebelumnya dan restart. `ensure` tidak pernah menghapus kolom, jadi versi lama tetap bisa berjalan di skema yang lebih baru.

## Pekerjaan terjadwal

| Pekerjaan | Lokasi | Jadwal |
| --- | --- | --- |
| Rekap manhours harian | `src/scheduler/logManhours.cron.ts` | 00:10 setiap hari (zona waktu server) dan saat start |
| Cuaca dan muka laut (Open-Meteo) | `src/scheduler/weatherSealevel.cron.ts` | 00:05 setiap hari dan saat start |
| Pemeriksaan kedaluwarsa dokumen (alarm) | `src/jobs/alarm-checker.ts` | Saat start |
| Pemulihan job AI yang terputus | `csms-ai/server/main.py` (lifespan) | Saat csms-ai start |

Bila backend dijalankan beberapa instance (pm2 cluster), pekerjaan terjadwal ikut berjalan di tiap instance. Jalankan satu instance, atau pisahkan instance khusus scheduler bila perlu skala.

## Troubleshooting

| Gejala | Penyebab umum | Tindakan |
| --- | --- | --- |
| Backend berhenti saat start dengan `[preflight] ... FAIL` | Konfigurasi salah (lihat baris FAIL) | Perbaiki env sesuai pesan; `SKIP_PREFLIGHT=true` hanya untuk darurat |
| csms-ai berhenti: `DATABASE_URL belum di-set` | File env tidak terbaca | Pastikan `ENV_FILE` / `CSMS_ENV` benar dan file ada di folder csms-ai |
| Gambar/dokumen 404 atau yang terbuka halaman aplikasi | nginx tidak meneruskan `/uploads/`, atau `UPLOADS_DIR` salah | Lihat konfigurasi nginx di 04-DEPLOY-SERVER.md |
| Evaluasi AI: "berkas tidak ditemukan" | `UPLOADS_DIR` backend dan csms-ai berbeda | Samakan, lalu restart keduanya. Preflight backend menampilkan peringatan ini |
| Evaluasi AI tertahan "queued" | csms-ai mati, atau membaca DB lain | `curl 127.0.0.1:8001/health`; pastikan `DATABASE_URL` sama dengan DB backend. Job menggantung > `CSMS_AI_JOB_STALE_MINUTES` otomatis ditandai gagal |
| Evaluasi AI gagal "LLM" | Endpoint LLM tidak terjangkau | `python -m server.preflight` menampilkan status tiap endpoint |
| Lampiran .rar tidak terbaca | `unar`/`unrar` tidak terpasang | `apt install unar` |
| Login berhasil tapi langsung keluar | `FRONTEND_URL`/`BETTER_AUTH_URL` beda skema/domain dengan yang dibuka, atau `COOKIE_PREFIX` bentrok | Samakan URL, bedakan prefix per lingkungan |
| Export PDF laporan harian gagal | Chromium tidak ada | Pasang chromium dan isi `CHROME_PATH` |
| Email tidak terkirim | `BREVO_API_KEY` kosong atau domain pengirim belum diverifikasi | Cek log backend; verifikasi domain di Brevo |
| Laporan harian gagal disimpan di instalasi baru (kolom tidak ada) | Instalasi dari versi sebelum serah terima | Sudah diperbaiki di branch ini (`07-column-repairs.ts` berjalan otomatis saat start) |

Catatan masalah yang pernah terjadi beserta analisanya ada di `docs/safeview-demo/BUG_AI_JOB_STUCK_QUEUED.md` dan `docs/safeview-demo/IMPLEMENTATION_PLAN.md`.
