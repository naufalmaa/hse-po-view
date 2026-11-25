# Paket Serah Terima HSE Proview

Dokumen ini adalah pintu masuk serah terima aplikasi **HSE Proview** (varian demo: **SafeView**) dari **Waviv Technologies** kepada **tim Production & Operation PHE OSES**. Branch `handover` berisi kode sumber lengkap tanpa kredensial, dengan riwayat commit diringkas menjadi satu commit awal.

| | |
| --- | --- |
| Penyerah | Waviv Technologies |
| Penerima | Tim Production & Operation PHE OSES |
| Sumber kode | branch `fullstack-ver` (pengembangan aktif), diringkas menjadi branch `handover` |
| Versi backend | 1.06.10 |
| Bahasa dokumen | Indonesia |

## Isi paket

| No | Dokumen | Untuk siapa | Isi |
| --- | --- | --- | --- |
| 1 | [01-ARSITEKTUR.md](01-ARSITEKTUR.md) | Semua | Komponen, alur data, port, dependensi luar |
| 2 | [02-KONFIGURASI.md](02-KONFIGURASI.md) | Infra, developer | Semua variabel env dan dari mana setiap key didapat |
| 3 | [03-DEPLOY-DOCKER.md](03-DEPLOY-DOCKER.md) | Infra | Instalasi dengan Docker Compose (disarankan) |
| 4 | [04-DEPLOY-SERVER.md](04-DEPLOY-SERVER.md) | Infra | Instalasi langsung di VM Linux (pm2 + nginx), sama dengan cara server saat ini berjalan |
| 5 | [05-DATABASE.md](05-DATABASE.md) | Developer, DBA | Struktur database, cara skema dikelola, backup dan restore |
| 5a | [database/ERD.md](database/ERD.md) | Developer, DBA | Diagram relasi per domain |
| 5b | [database/KAMUS-DATA.md](database/KAMUS-DATA.md) | Developer, DBA | Kamus data 62 tabel (kolom, tipe, kunci, indeks) |
| 5c | [database/schema.sql](database/schema.sql) | DBA | DDL lengkap (`pg_dump --schema-only`) |
| 6 | [06-MODUL-APLIKASI.md](06-MODUL-APLIKASI.md) | Semua | Modul yang selesai, peran pengguna, lokasi kode tiap modul |
| 7 | [07-OPERASIONAL.md](07-OPERASIONAL.md) | Operasi | Health check, backup, update versi, troubleshooting |
| 8 | [08-LLM.md](08-LLM.md) | Infra, developer | Model AI untuk CSMS AI dan cara menyiapkannya |
| 9 | [09-PENGEMBANGAN.md](09-PENGEMBANGAN.md) | Developer | Setup lokal, tes, CI, konvensi |
| 10 | [10-AKSES-DAN-KREDENSIAL.md](10-AKSES-DAN-KREDENSIAL.md) | Pemilik repo, infra | Checklist fork repo, akses, dan kredensial yang harus dibuat baru |

Setiap dokumen di atas juga tersedia dalam PDF di folder [pdf/](pdf/).

Data yang **tidak** ada di repo dan diserahkan terpisah lewat kanal terenkripsi: dump database produksi (`.sql.gz`) dan arsip folder uploads (`.tar.gz`), dibuat dengan [scripts/backup-server.sh](scripts/backup-server.sh).

## Urutan membaca yang disarankan

1. Arsitektur, lalu Modul Aplikasi: memahami apa yang diserahkan.
2. Akses dan Kredensial: menyiapkan repo dan semua key milik sendiri.
3. Konfigurasi, lalu Deploy Docker atau Deploy Server: memasang aplikasi.
4. Database dan Operasional: memulihkan data dan menjalankan harian.

## Perubahan yang dibuat khusus untuk serah terima

Dibanding `fullstack-ver`, branch `handover` berisi perubahan berikut. Semua sudah diuji pada database PostgreSQL kosong.

| Area | Perubahan |
| --- | --- |
| Kredensial | Semua password, API key, secret, IP server, dan path server dihapus dari kode, template env, dan dokumen. Template env baru mencantumkan sumber tiap key. Skrip SSH tunnel kini membaca semua nilai dari env. |
| Password awal karyawan | Password awal akun karyawan (bila tanggal lahir kosong) tidak lagi tertanam di kode; diatur lewat `EMPLOYEE_DEFAULT_PASSWORD`, bawaannya acak. |
| Pengirim email | Alamat pengirim email tidak lagi tertanam di kode; diatur lewat `EMAIL_FROM_ADDRESS` dan `EMAIL_FROM_NAME`. |
| Instalasi baru | **Perbaikan bug:** auto-ensure skema membuat 6 kolom dengan nama yang berbeda dari kode (mis. `report_meetings.description` seharusnya `meeting_description`), sehingga instalasi baru gagal saat menyimpan laporan harian. Kini diperbaiki, dan database lama yang terlanjur salah otomatis diperbaiki saat start (`src/db/ensure/07-column-repairs.ts`). |
| Konfigurasi env | Variabel di file env (mis. `BETTER_AUTH_URL`, `ADMIN_DEFAULT_*`) kini juga terbaca saat memakai `ENV_FILE=...` di Node, tidak hanya di Bun. |
| Preflight | Pemeriksaan saat start (DB, ekstensi, uploads, secret, csms-ai) dengan pesan jelas, dan `npm run preflight` / `python -m server.preflight` untuk dijalankan sebelum deploy. |
| Health check | `GET /api/public/health` (backend) dan `GET /health` (csms-ai) memeriksa DB dan folder uploads sungguhan, menjawab 503 bila tidak sehat. |
| csms-ai | `DATABASE_URL` wajib diisi (tidak ada lagi bawaan ke DB lain). Alamat LLM bawaan menunjuk `localhost`. |
| Password demo | Skrip `docs/safeview-demo/set_demo_passwords.mjs` kini membuat password acak per akun (bukan satu password seragam). |
| Docker | `Dockerfile` untuk backend, csms-ai, frontend, `docker-compose.yml` di root repo, dan panduan langkah demi langkah. Image dibangun sendiri oleh penerima. |
| Build backend | Skrip `npm run build` kini menyalin file bahasa (`src/locales`) dengan benar saat dibangun di Linux. |
| Skema | `docs/handover/database/schema.sql`, kamus data, dan ERD dihasilkan otomatis dari kode; CI memastikan `schema.sql` tidak basi. |
| CI | `.github/workflows/ci.yml`: pemindaian kredensial (gitleaks), typecheck, unit test, build, dan pemeriksaan skema. |
| Dependensi | `package-lock.json` backend dan frontend kini ikut di repo (build dapat diulang persis). Peer dependency yang sebelumnya terpasang implisit (`typebox`, `@better-auth/drizzle-adapter`) kini tercatat. |
| Kerapian | Brosur/poster, keluaran laporan uji, folder scratch, dan output notebook dihapus. Notebook riset tetap ada tanpa output. |

## Kontak

Pertanyaan teknis selama masa transisi: tim Waviv Technologies (kontak disepakati di berita acara serah terima).
