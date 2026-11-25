# 10. Akses Repository dan Kredensial

Branch `handover` sudah bersih dari kredensial: tidak ada password, API key, secret, alamat IP server, atau path server di kode, template env, maupun dokumen, dan riwayat commit diringkas menjadi satu commit sehingga kredensial lama di riwayat pengembangan tidak ikut. Tim penerima membuat semua kredensial baru sendiri.

## A. Repository

- [ ] Buat repository baru (privat) di akun/organisasi penerima, atau fork dari repository asal lalu jadikan `handover` sebagai branch utama.
- [ ] Bila fork: pilih hanya branch `handover` ("Copy the default branch only" setelah `handover` dijadikan default), karena branch lain berisi riwayat pengembangan.
- [ ] Ganti nama branch `handover` menjadi `main` di repo penerima bila diinginkan (CI sudah mendengarkan `main` dan `handover`).
- [ ] Aktifkan Settings > Code security: Secret scanning dan Push protection.
- [ ] Aktifkan branch protection pada `main`: wajib pull request dan CI hijau.
- [ ] Undang anggota tim: minimal 2 admin, sisanya Write.
- [ ] Pastikan GitHub Actions aktif agar `.github/workflows/ci.yml` berjalan.

## B. Kredensial yang harus dibuat baru

Tidak ada kredensial dari Waviv yang diserahkan atau boleh dipakai ulang. Cara membuat tiap key ada di [02-KONFIGURASI.md](02-KONFIGURASI.md#dari-mana-setiap-key-didapat).

| No | Kredensial | Dipakai di | Pemilik di tim penerima |
| --- | --- | --- | --- |
| 1 | User + password PostgreSQL per lingkungan | backend, csms-ai | DBA / infra |
| 2 | `BETTER_AUTH_SECRET` per lingkungan | backend | infra |
| 3 | Akun admin awal aplikasi | `db:init_data` | admin aplikasi |
| 4 | Akses server (SSH key, bukan password) | deploy | infra |
| 5 | Sertifikat TLS dan domain | nginx / load balancer | infra |
| 6 | Server LLM (dan API key bila dilindungi) | csms-ai | infra / tim AI |
| 7 | API key Brevo atau layanan email lain + verifikasi domain pengirim | backend (opsional) | infra |
| 8 | API key OpenAI (opsional, cadangan) | csms-ai | pemilik anggaran |

Simpan semuanya di password manager atau secret manager milik penerima, bukan di repo atau chat.

## C. Data yang diserahkan terpisah (bukan lewat git)

| Data | Berkas | Cara membuat | Catatan |
| --- | --- | --- | --- |
| Database produksi | `pheview_hse_<tanggal>.sql.gz` | `scripts/backup-server.sh` di server lama | Berisi data pribadi pekerja dan akun pengguna (hash password). Kirim lewat kanal terenkripsi |
| Folder uploads | `uploads_pheview_hse_<tanggal>.tar.gz` | idem | Berisi dokumen kontraktor dan karyawan |
| Checksum | `SHA256SUMS` | idem | Cocokkan setelah dipindah: `sha256sum -c SHA256SUMS` |
| Data demo sintetis | `docs/demo_data/synthetic_pheview_hse_server.sql.gz` | sudah di repo | Data rekaan, aman untuk pelatihan |

Setelah restore database produksi, semua pengguna tetap memakai password lamanya (hash ikut di dump). Bila ingin memaksa ganti password, minta pengguna memakai fitur ganti password atau reset lewat admin. Mengganti `BETTER_AUTH_SECRET` membuat semua pengguna login ulang.

## D. Hal yang tetap di sisi Waviv (tidak diserahkan)

- Server, alamat IP, akun SSH, dan database yang dipakai selama pengembangan dan demo.
- Kredensial layanan pihak ketiga milik Waviv (OpenAI, Brevo, server LLM Waviv).
- Riwayat commit lengkap pengembangan (tetap di repository asal).

## E. Verifikasi serah terima

- [ ] CI di repo penerima hijau, termasuk job gitleaks.
- [ ] Aplikasi berhasil dipasang dari nol oleh tim penerima memakai [03-DEPLOY-DOCKER.md](03-DEPLOY-DOCKER.md) atau [04-DEPLOY-SERVER.md](04-DEPLOY-SERVER.md), tanpa bantuan.
- [ ] Data produksi berhasil di-restore; jumlah baris tabel utama dan checksum berkas cocok.
- [ ] Health check backend dan csms-ai sehat; satu Evaluasi AI CSMS berhasil.
- [ ] Berita acara serah terima ditandatangani, termasuk masa dukungan transisi.
