# 06. Modul Aplikasi

Semua modul di bawah sudah selesai dan berjalan di lingkungan produksi dan demo saat serah terima. Kolom "Kode" menunjukkan tempat memulai bila ingin mengubah modul tersebut.

Path frontend relatif terhadap `frontend/phe-view-hse/src/`, path backend relatif terhadap `backend/phe-view-hse/backend/src/`.

| No | Modul | Fitur utama | Halaman (frontend) | API (backend) | Tabel utama |
| --- | --- | --- | --- | --- | --- |
| 1 | Dashboard HSE Performance | KPI (safe manhours, hari bebas LTI/RI, TRIR, LTIFR), piramida keselamatan, leading indicator, filter proyek/marine/kontraktor, export | `routes/_private/_dashboard`, `components/pages/hse-performance` | `routes/v1/user/daily_report`, `services/` | `daily_reports`, `report_*`, `log_manhours` |
| 2 | Laporan Harian (Daily Report) | Laporan proyek dan marine: manhours/POB, PTW, cuaca dan muka laut, drill, inspeksi, rapat, pelatihan, kartu pintar, lampiran; duplikasi; export PDF | `routes/_private/daily-report`, `components/pages/daily-report` | `routes/v1/user/daily_report` | `daily_reports`, 13 tabel `report_*` |
| 3 | Daily Activity | Ringkasan aktivitas harian | `routes/_private/daily-activity` | `routes/v1/user/daily_report` | `daily_reports` |
| 4 | CSMS | Pedoman, kualifikasi, penilaian risiko, kontrak, folder 8 elemen K3LL berjenjang, penilaian Evaluator > Verifikator > Manager, catatan perbaikan, salin berkas PB, export e-CSMS/evaluasi/catatan perbaikan, unduh ZIP, email notifikasi | `routes/_private/csms`, `components/pages/csms` | `routes/v1/user/csms` | `csms_contract`, `csms_contract_folder`, `csms_approval_log` |
| 5 | CSMS AI | Evaluasi AI per folder (mode cepat/teliti), OCR dokumen pindaian, ZIP/RAR/7Z, dashboard hasil AI, terapkan rekomendasi AI (bisa dibatalkan), umpan balik evaluator, rubric Excel berversi, uji coba rubric | `components/pages/csms`, `routes/_private/admin/__csms-ai` | `routes/v1/user/csms/contract/folder`, `routes/v1/admin/csms-ai`, layanan `csms-ai/` | `csms_ai_*`, `csms_knowledge_base` |
| 6 | Karyawan | Data pekerja, MCU, sertifikat, BPJS, kontrak, SIKA, vaksinasi, impor Excel, verifikasi, alarm masa berlaku | `routes/_private/employee`, `components/pages/employee` | `routes/v1/user/employee` | `employees`, `employee_*` |
| 7 | POB | Rekap POB, days on board, rekonsiliasi data POB yang tidak cocok | `routes/_private/employee/(pob)` | `routes/v1/user/employee/pob-*` | `employee_status`, `pob_unmatched_logs` |
| 8 | Kartu Pintar (Smart Card) | Observasi perilaku aman/tidak aman, stop work authority, CLSR, impor Excel massal dengan tabel perbaikan galat, dashboard | `routes/_private/employee/_smart-card` | `routes/v1/user/smart-card`, `routes/v1/user/employee/import-excel.ts` | `smart_card_observations`, `upload_history` |
| 9 | Absensi | Check-in/out dengan foto dan koordinat, riwayat absensi, kelola absensi | `routes/_private/employee/attendance`, `attendance-list.tsx` | `routes/v1/employee`, `routes/v1/user/employee/attendance-*` | `attendance` |
| 10 | Master data | Proyek (sub-type), lokasi kerja, kontraktor, kapal, relasi kontraktor-kapal | `routes/_private/_sub-types`, `_contractors`, `_vessels`, `_contractor-vessel` | `routes/v1/user/contractor`, `contractor-vessel`, `daily_report/subtypes` | `subtypes`, `work_locations`, `sub_contractors`, `vessels` |
| 11 | Notifikasi | Pusat notifikasi dan alarm, real-time lewat WebSocket | `routes/_private/notification` | `routes/v1/user/notification`, `routes/v1/user/ws`, `db/listener.ts` | `user_alarm_log`, `employee_alarm_log`, `csms_alarm_log` |
| 12 | Administrasi | Pengguna dan peran, sesi aktif, pengaturan CSMS AI | `routes/_private/admin` | `routes/v1/admin` | `users`, `sessions` |
| 13 | Profil dan login | Login, profil, ganti password, keluar dari sesi lain | `routes/_private/user`, `components/pages/auth` | `routes/auth`, `auth.ts` | `users`, `accounts`, `sessions` |
| 14 | Tutorial in-app | 24 tutorial untuk 7 peran, PDF panduan per peran | `constants/tutorials.ts`, `public/tutorials/*.pdf` | - | - |

## Peran pengguna

| Peran (`users.role`) | Tugas utama |
| --- | --- |
| `admin` | Kelola pengguna, peran, master data, pengaturan CSMS AI |
| `user` (HSE Officer) | Dashboard HSE, laporan harian, POB, kartu pintar |
| `evaluator` | Menilai dokumen CSMS (manual atau dengan AI), menulis catatan perbaikan |
| `verifikator` | Memverifikasi penilaian evaluator |
| `manager` | Persetujuan akhir CSMS |
| `contractor` | Mengunggah dokumen CSMS, data pekerja kontraktor |
| `crew` | Laporan harian kapal |
| `employee` | Absensi dan kartu pintar milik sendiri |

## Komponen AI (model) yang diserahkan

Folder `backend/phe-view-hse/backend/csms-ai/` berisi seluruh kode "model" penilaian CSMS. Tidak ada bobot model (weights) yang dilatih sendiri; penilaian memakai LLM umum (Qwen lewat vLLM) yang diarahkan dengan prompt, rubric, dan knowledge base.

| Bagian | Folder | Isi |
| --- | --- | --- |
| Server | `server/` | API FastAPI, antrian job, rubric, preflight |
| Pipeline | `engine/` | Ekstraktor (PDF, Word, Excel, gambar, arsip, OCR), provider LLM, juri dan konsensus, validator |
| Agen | `agents/` | Prompt, peran, dan tanggung jawab tiap agen |
| Konfigurasi | `configs/` | Peran model (`model_roles.json`), kebijakan skor, workflow |
| Knowledge base | `knowledge_base/` | Kriteria penilaian marine (Excel rubric v4) dan dokumen acuan |
| Validator | `validators/` | Aturan validasi bukti |
| Riset | `notebook*/` | Notebook eksperimen (output dihapus), tidak dipakai saat produksi |
| Tes | `tests/` | Unit test rubric, aturan skor, kegagalan LLM, ekstraksi |

Dokumentasi rinci engine: `csms-ai/readme.md`, `csms-ai/docs/`, serta laporan kalibrasi di `docs/safeview-demo/` (`GUIDE_KALIBRASI_AI.md`, `ANALISIS_KALIBRASI_RUBRIK.md`, `REPORT_AI_*`).
