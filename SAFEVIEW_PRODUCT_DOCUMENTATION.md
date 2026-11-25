# 📋 Product Feature Specification & System Analysis: SafeView / PHE View HSE
**Product:** PHE View HSE (SafeView / Proview HSE)  
**Role:** Expert Lead Product Manager  
**Date:** Oktober 2026  
**Status:** Living Document / Ready for Stakeholder Review  

---

## Executive Summary

**PHE View HSE** (juga dikenal sebagai *SafeView* / *Proview HSE*) adalah platform *Enterprise Health, Safety, and Environment Management System* (HSEMS) terintegrasi berbasis web dan AI-driven microservice. Platform ini dikembangkan khusus untuk operasi hulu minyak & gas bumi (khususnya PHE OSES), mencakup manajemen operasi lapangan darat (*Project*) dan armada laut (*Marine*).

Platform ini mengintegrasikan **pemantauan performa K3LL secara real-time**, **pelaporan harian operasional**, **sistem akreditasi & audit kontraktor otomatis berbasis AI (CSMS)**, **manajemen kompetensi & kesehatan pekerja**, serta **analisis observasi perilaku keselamatan (Smart Card/Karpit)** ke dalam satu ekosistem terpadu.

---

## 🏛️ Arsitektur Sistem & Tech Stack

```
+-------------------------------------------------------------------------------------------------+
|                                        FRONTEND CLIENT                                          |
|  React 19 + TypeScript + Vite | TanStack Router & Query | Tailwind CSS + Radix UI (shadcn)     |
|  i18next (ID/EN) | Recharts & Custom Data Visualizations | Responsive Web & Mobile-Optimized    |
+-------------------------------------------------------------------------------------------------+
                                                │ (REST API & WebSockets)
                                                ▼
+-------------------------------------------------------------------------------------------------+
|                                      BACKEND CORE SERVICE                                       |
|  Node.js + Fastify / Express + TypeScript | Drizzle ORM | Socket.IO (Real-time updates)         |
|  Better-Auth / Session-based RBAC | Scheduled Workers & Alert Engine                           |
|  Database: PostgreSQL with pgvector (Embeddings) & ltree (Hierarchical Categories)             |
+-------------------------------------------------------------------------------------------------+
                                                │ (FastAPI HTTP / Asynchronous Worker)
                                                ▼
+-------------------------------------------------------------------------------------------------+
|                                    CSMS AI ENGINE MICROSERVICE                                  |
|  Python FastAPI | Multi-Agent Orchestration (LangChain / Specialized Agents)                    |
|  Ingestion, Extraction, Validation, Scoring, Consensus, Reviewer Summary, Appeal                |
|  Vector RAG Knowledge Base (K3LL Standar Migas & Marine Criteria)                               |
+-------------------------------------------------------------------------------------------------+
```

---

## 👥 Matriks Peran & Hak Akses Pengguna (User Personas & RBAC)

Aplikasi memiliki granular role-based access control (RBAC) yang terbagi dalam 8 peran:

| Peran (Role) | Deskripsi Utama | Hak Akses Utama |
|---|---|---|
| **Admin** | Administrator sistem | Manajemen seluruh pengguna, kontrol hak akses, master data perusahaan, konfigurasi sistem. |
| **User / HSE Officer** | Manajemen K3LL internal PHE | Akses penuh dashboard performa HSE, pemantauan reporting harian, validasi POB, review smart card. |
| **Evaluator** | Penilai Dokumen CSMS (Tier 1) | Evaluasi dokumen kontraktor, menjalankan skoring manual/AI, memberikan catatan perbaikan. |
| **Verifikator** | Pemeriksa Hasil Evaluasi (Tier 2) | Memverifikasi konsistensi penilaian evaluator, menyetujui atau mengembalikan hasil penilaian. |
| **Manager** | Pengesah Akhir CSMS (Tier 3) | Memberikan approval final hasil penilaian kontrak CSMS dan pengesahan sertifikat kualifikasi. |
| **Contractor** | Mitra Kerja / Kontraktor | Mengunggah dokumen pemenuhan K3LL, mengajukan tanggapan catatan perbaikan, mengelola data pekerja kontraktor. |
| **Crew** | Operator Kapal / Kru Laut | Input laporan harian kapal (kondisi cuaca, sea level, POB kapal, jam kerja operasional marine). |
| **Employee** | Pekerja Lapangan / Mandiri | Absensi harian (swafoto + geo-tagging), melihat profil HSSE Passport, input kartu observasi Smart Card. |
| **Auditor** | Auditor Kepatuhan / SKK Migas | Read-only audit trail ke seluruh kontrak, bukti dokumen, histori skor AI, dan metrik keselamatan. |

---

## 🚀 Katalog Fitur Lengkap Web Aplikasi

### 1. Modul HSE Performance Dashboard & Analytics
Dashboard analitik eksekutif untuk mengukur performa keselamatan operasi secara menyeluruh, memadukan lagging dan leading indicators sesuai standar IOGP (*International Association of Oil & Gas Producers*) dan OSHA 1904.

- **KPI Cards & Executive Summary:**
  - **Safe Operating Days:** Menghitung hari bebas kecelakaan (Free LTA Days & Free RI Days).
  - **Total Safe Manhours & Actual Exposure Hours:** Pencatatan jam kerja aman terakumulasi tanpa insiden LTI.
  - **TRIR (Total Recordable Incident Rate) & LTIFR:** Metrik frekuensi insiden per paparan jam kerja.
  - **Fatality, LTI, RWDC, MTC, FAC, High Potential Incidents (HiPo).**
- **Safety Pyramid Visualizer (Heinrich / Bird Triangle):**
  - Visualisasi interaktif piramida insiden dari *Unsafe Action/Condition* (dasar), *Near Miss*, *First Aid*, *Medical Treatment*, hingga *Fatality* (puncak).
- **Leading Indicators Monitoring:**
  - Tracking 5 pilar preventif: Kartu Pintar (Karpit), Rapat Keselamatan (Meeting), Tanggap Darurat (Drill), Inspeksi Fasilitas (Inspection), dan Pelatihan (Training).
- **Multi-Level Filter:**
  - Filter berdasarkan rentang tanggal kalender, kategori operasi (Project vs. Marine), subtipe proyek, dan kontraktor.
- **Reporting & Exporting:**
  - Ekspor laporan ringkasan berkas eksekutif dalam format PDF dan lembar kerja Excel siap cetak.

---

### 2. Modul Daily Reporting (Pelaporan Harian Operasi)
Pusat pencatatan aktivitas lapangan setiap hari untuk menjaga kepatuhan dan akuntabilitas jam kerja maupun bahaya operasional.

- **Dual Mode Reporting:**
  1. **Project Daily Report:** Untuk aktivitas konstruksi, fabrikasi, instalasi rig, dan operasi darat/platform.
  2. **Marine Daily Report:** Untuk armada laut, kapal tunda, barge, AHTS, dan kapal suplai.
- **Komponen Formulir Pelaporan Komprehensif:**
  - **Manhours & POB (Personnel On Board):** Jumlah pekerja PHE OSES vs. Kontraktor, serta akumulasi jam kerja terpapar (*exposure hours*).
  - **Permit to Work (PTW / SIKA):** Registrasi izin kerja berisiko tinggi (Hot Work, Cold Work, Confined Space Entry, Working at Height, L2RA).
  - **Marine Weather & Sea Conditions:** Pemantauan real-time status wilayah SBU, CBU, NBU: tinggi gelombang, kecepatan angin, kondisi langit, pitching/rolling kapal.
  - **Drills & Inspections Log:** Pencatatan jenis latihan (Fire, Abandon Ship, Man Overboard, H2S) serta inspeksi LSA (*Life Saving Appliances*) dan FFA (*Fire Fighting Appliances*).
  - **Meetings & Campaigns:** Log toolbox talk, general safety meeting, pre-job safety meeting, dan kampanye keselamatan.
  - **Daily Activity & Next Plan:** Catatan progres harian, hambatan kerja, dan rencana tindak lanjut hari berikutnya.
  - **Attachment Management:** Unggah dokumen bukti pelaksanaan, formulir izin kerja, dan foto dokumentasi lapangan.

---

### 3. Modul Contractor Safety Management System (CSMS) & AI Evaluation Engine
Jantung pengelolaan keselamatan kontraktor dari fase pra-kualifikasi hingga evaluasi pelaksanaan kontrak berjalan (*Ongoing Assessment*), didukung AI multi-agent.

- **Struktur Hierarki 8 Elemen K3LL Standar Migas:**
  - Implementasi struktur folder pohon menggunakan PostgreSQL `ltree` dengan kedalaman bertingkat:
    1. *Kepemimpinan dan Komitmen*
    2. *Kebijakan dan Sasaran Strategis K3LL*
    3. *Organisasi, Tanggung Jawab, Sumber Daya, Standar & Dokumentasi*
    4. *Manajemen Risiko K3LL*
    5. *Perencanaan dan Prosedur*
    6. *Implementasi dan Pemantauan Kinerja K3LL*
    7. *Audit dan Tinjauan Manajemen K3LL*
    8. *Manajemen K3LL - Tindak Lanjut*
- **Multi-Agent AI Scoring Platform:**
  - **Ingestion & Extraction Agent:** Ekstraksi otomatis teks, tabel, dan metadata dari berkas PDF/Word bukti implementasi K3LL yang diunggah kontraktor.
  - **Vector Semantic Search (pgvector):** Pencarian kecocokan konteks dokumen terhadap basis pengetahuan (*knowledge base*) persyaratan standar migas.
  - **Scoring & Validation Agent:** AI memberikan rekomendasi skor awal (0, 3, 6, 10 / N/A) disertai *reasoning* (argumen pembenaran) berbasis bukti faktual.
  - **Consensus & Reviewer Summary Agent:** Menyatukan perspektif evaluator hukum, teknis, dan HSE untuk ringkasan evaluasi.
- **Quick Scoring Modal & Bulk Assessment:**
  - Antarmuka super cepat bagi Evaluator untuk meninjau 29 subkategori daun (*leaf categories*), menerima/menyesuaikan saran AI, mengubah status (*Accept, Revisi, Reject*), dan memberikan catatan perbaikan dalam hitungan klik.
- **Workflow Persetujuan 3 Tingkat (3-Tier Approval Workflow):**
  - Alur berjenjang: **Evaluator** (Input skor & catatan) ➔ **Verifikator** (Verifikasi kesesuaian) ➔ **Manager** (Persetujuan final & lock assessment).
- **Catatan Perbaikan & Response Loop:**
  - Kontraktor menerima daftar ketidaksesuaian, dapat mengunggah bukti perbaikan, dan menuliskan tanggapan langsung pada antarmuka sistem.
- **Kualifikasi & Sertifikasi CSMS:**
  - Registrasi sertifikat kualifikasi, masa berlaku, nilai kelulusan, dan status kelaikan kerja.
- **Automated Alarm & Notification System:**
  - Early-warning reminder (30, 60, 90 hari) sebelum masa berlaku kontrak CSMS atau sertifikat kualifikasi berakhir.
  - Pengiriman email notifikasi otomatis kepada person-in-charge kontraktor dan evaluator.
- **Export & Deliverables:**
  - Ekspor form evaluasi standar e-CSMS, Catatan Perbaikan PDF, ringkasan skor Excel, serta fitur download seluruh dokumen folder kontrak dalam format ZIP.

---

### 4. Modul Manajemen Pekerja (Employee Safety & Health Lifecycle)
Manajemen profil tenaga kerja, kesiapan medis, kelaikan kerja, dan pelacakan kehadiran di lokasi risiko tinggi.

- **Data Pekerja & HSSE Passport:**
  - Registrasi ID, nomor KTP, nomor unik HSSE Passport, kategori (Mitra, Project, Crew Marine), jabatan, serta foto profil.
- **Medical Check-Up (MCU) & Kelaikan Bekerja:**
  - Rekam medis tanggal MCU dan masa kedaluwarsa.
  - Penilaian *Occupational Health & Industrial Hygiene* (OHIH Review).
  - Klasifikasi status kelaikan kerja: *Fit to Work*, *Fit with Note*, atau *Unfit*.
  - Perhitungan **Skor Kardiovaskuler Jakarta (SKJ)** untuk mitigasi risiko serangan jantung/darurat medis di lepas pantai.
- **Manajemen Sertifikasi & Lisensi:**
  - Tracking sertifikat wajib migas (BST - Basic Safety Training, Rigger, Scaffolder, SIO Crane, First Aider, Fire Watcher, Gas Tester, dll.).
  - Monitoring sertifikat permanen vs. berkala beserta status masa kedaluwarsanya.
- **Jaminan Sosial & Dokumen Legal:**
  - Pelacakan kepesertaan BPJS Ketenagakerjaan & BPJS Kesehatan, serta asuransi kesehatan lainnya.
  - Masa berlaku kontrak kerja pekerja terhadap kontraktor.
- **Monitoring POB (Personnel On Board) & Days on Board (DOB):**
  - Pelacakan durasi rotasi pekerja di lapangan (*Days on Board*).
  - Deteksi dan alert otomatis pekerja yang mengalami *overstay* (melebihi batas maksimal rotasi kerja selamat, misal > 14 atau > 28 hari berturut-turut).
- **Reconciliation Engine (POB Unmatched Logs):**
  - Fitur pintar untuk mencocokkan data manifest POB harian dari lapangan terhadap master data pekerja melalui algoritma *fuzzy matching*, mempermudah resolusi anomali data nama atau perusahaan.

---

### 5. Modul Smart Card (Karpit) & Behavioral Safety Observation
Digitalisasi kartu pengamatan keselamatan kerja (*hazard hunt* dan intervensi perilaku) untuk membangun budaya K3LL partisipatif.

- **Digital Observation Form:**
  - Tanggal, jam, fungsi/bagian, area pengamatan, dan lokasi spesifik.
  - Klasifikasi KTA (Kondisi Tidak Aman) vs. TTA (Tindakan Tidak Aman).
  - Kategori perilaku amatan dan aspek keselamatan (APD, Peralatan, Prosedur, Lingkungan).
- **Stop Work Authority (SWA):**
  - Pencatatan apakah pengamat menggunakan hak *Stop Work Authority* untuk menghentikan pekerjaan berisiko fatal.
- **What-Who-How Analysis:**
  - Analisis mendalam penyebab kejadian: *What happened*, *Who was involved*, *How to prevent recurrence*.
- **CLSR (Corporate Life Saving Rules):**
  - Pemetaan observasi terhadap 10-12 aturan keselamatan krusial migas (e.g., Confined Space, Bypassing Safety Controls, Safe Zone, Working at Height).
- **Near Miss & Hazardous Condition Tracking:**
  - Penilaian prioritas tindak lanjut (*High, Medium, Low*), penanggung jawab perbaikan, dan status penutupan temuan (*Open, In-Progress, Closed*).
- **Bulk Excel Import & Validation Engine:**
  - Fasilitas upload ratusan data observasi sekaligus via Excel dengan sistem penanganan galat interaktif (*error resolution table*) untuk baris data pekerja yang belum terdaftar.

---

### 6. Modul Absensi Pekerja & Verifikasi Kehadiran
Sistem kehadiran berbasis verifikasi ganda untuk memastikan kesiapan personil di lokasi kerja.

- **Mobile-Responsive Check-In / Check-Out:**
  - Mengubah status tugas (*On Duty* vs. *Off Duty*).
  - Wajib melampirkan bukti swafoto (*Photo Evidence*).
  - Pencatatan koordinat geolokasi (*Latitude & Longitude*) dan lokasi kerja resmi (*Work Location*).
- **Integrasi Otomatis Siklus Rotasi (DOB):**
  - Check-in pertama secara otomatis memulai penghitungan siklus *Days on Board* untuk pekerja bersangkutan.
- **Tabel Riwayat Absensi:**
  - Rekam jejak riwayat check-in/out harian yang dapat difilter per tanggal, lokasi kerja, dan subkontraktor.

---

### 7. Modul Data Management & Administrasi Sistem
Pusat konfigurasi master data yang menopang seluruh transaksi data operasional.

- **Master Proyek (Subtypes) & Work Locations:**
  - Pendataan proyek hulu migas, penetapan nama area, dan koordinat geografis titik kerja.
- **Master Kontraktor (Sub Contractors):**
  - Manajemen perusahaan mitra kerja, kategori industri (Project, Marine, Mitra), dan relasi kontrak.
- **Master Armada Laut (Vessels) & Kontraktor Kapal:**
  - Registrasi data teknis kapal, kapasitas tampung personil, tipe armada, dan asosiasi kepemilikan/sewa dengan kontraktor.
- **Pusat Notifikasi & Alarm Terpadu:**
  - Log alarm sistem yang mencakup kedaluwarsa dokumen pekerja, alarm penilaian CSMS, serta audit log pengiriman email evaluasi.

---

## ❓ Open Questions & Klarifikasi Kebutuhan (PM Review)

Sebagai bahan evaluasi bersama stakeholder sebelum mengeksekusi iterasi berikutnya, berikut beberapa *open questions* strategis:

1. **Standarisasi Metrik TRIR (OSHA 200.000 vs. IOGP 1.000.000):**
   * *Pertanyaan:* Sesuai dokumen analisis gap yang ada, sistem eksisting masih menggunakan formula campuran dengan pembagi *Safe Manhours* (yang bisa reset saat insiden). Apakah kita akan menyepakati migrasi penuh ke standar **IOGP (Pengali 1.000.000 dan pembagi Actual Exposure Hours)**, atau mempertahankan opsi konfigurasi saklar toggle (200k vs 1M) di antarmuka dashboard?
2. **Tingkat Otonomi AI pada Skoring CSMS:**
   * *Pertanyaan:* Saat ini model AI bertindak sebagai *Co-pilot / Evaluator Assistant* (memberikan rekomendasi skor 0/3/6/10 dan argumen di *Quick Scoring Modal*). Apakah di masa depan direncanakan fitur *Auto-Accept Approval* untuk dokumen administratif dengan tingkat keyakinan (*confidence score*) di atas threshold tertentu (misal >95%), atau tetap wajib melewati *human-in-the-loop*?
3. **Strategi Mode Offline untuk Operasi Remote/Offshore:**
   * *Pertanyaan:* Di anjungan lepas pantai atau kapal tanpa koneksi satelit stabil, apakah form *Daily Report* dan *Smart Card* perlu dilengkapi fitur *Offline-First PWA (IndexedDB + Background Sync)* ketika pekerja kembali mendapat koneksi?
4. **Logika Reset Hari Bebas Insiden (Free LTA vs Free RI):**
   * *Pertanyaan:* Apakah tim manajemen setuju untuk memisahkan reset kejadian medis ringan (MTC) agar **hanya mereset Free Recordable Incident (Free RI)** tanpa mereset **Free Lost Time Accident (Free LTA)**, sesuai kaidah industri migas?
5. **Kebijakan Penyelesaian Anomali POB (Unmatched Manifest):**
   * *Pertanyaan:* Pada upload manifest POB harian yang tidak cocok dengan master karyawan, apakah data tersebut diizinkan masuk sebagai *Guest/Temporary POB* sementara waktu agar jam kerja tetap terhitung, atau wajib diselesaikan terlebih dahulu oleh admin lapangan?

---

## 🗺️ Rekomendasi Solusi & Rencana Aksi (Execution Roadmap)

Berdasarkan analisis arsitektur dan bisnis, dirancang peta jalan pengembangan 3 fase yang paling **efektif, efisien, dan berdampak tinggi**:

### Fase 1: Core Stabilisation & Calculation Alignment (Quick Wins - 2-3 Minggu)
- [x] **Audit & Standardisasi Formula Metrik:** Perbaiki penyebut kalkulasi TRIR menggunakan *Total Actual Exposure Manhours* agar terhindar dari distorsi pembagian nol saat terjadi insiden.
- [x] **Pemisahan Logika Free LTA vs Free RI:** Implementasikan kalkulasi hari kalender bersih (*elapsed days*) sejak insiden terakhir, memisahkan dampak kejadian MTC dari LTA.
- [x] **Penyempurnaan Quick Scoring Modal:** Pastikan respon rendering data 29 leaf-folders lancar dengan caching TanStack Query dan feedback loading yang informatif saat AI memproses data.

### Fase 2: Enterprise Intelligence & Operational Efficiency (Bulan 1-2)
- [ ] **Automated PDF Report Generator:** Peningkatan generator laporan eksekutif bulanan otomatis (Executive HSE Monthly Report) yang menggabungkan grafik TRIR, leading indicators, dan rekap CSMS kontraktor.
- [ ] **AI Confidence Score & Source Grounding:** Tampilkan visualisasi *highlight snippet* dari halaman PDF bukti dokumen tepat di samping argumen evaluasi AI pada antarmuka CSMS agar evaluator dapat memverifikasi bukti dalam 1 detik.
- [ ] **Penyelesaian Batch Unmatched POB:** Interface intuitif *drag-and-match* untuk menyelesaikan daftar pekerja yang belum terdaftar saat upload manifest harian.

### Fase 3: Proactive Safety & Advanced Offline Capabilities (Bulan 3+)
- [ ] **Offline PWA Support:** Dukungan service worker dan local storage agar formulir Smart Card dan Daily Marine Report dapat diisi di kondisi laut lepas tanpa sinyal dan auto-sync saat online.
- [ ] **Predictive Leading Indicator Analytics:** Deteksi dini anomali keselamatan berbasis tren (contoh: jika rasio pelaporan kartu pintar menurun drastis di suatu anjungan sementara jam kerja meningkat, sistem membunyikan peringatan dini risiko insiden).

---

## Kesimpulan PM
Repositori ini telah memiliki fondasi arsitektur perangkat lunak yang sangat matang, memadukan frontend modern berkinerja tinggi, backend relasional yang kokoh dengan ekstensi tingkat lanjut (`ltree` dan `pgvector`), serta layanan AI microservice spesifik domain industri migas. 

Dokumentasi ini siap dijadikan acuan bersama antara Product Management, Engineering Lead, dan HSE Stakeholders untuk eksekusi sprint berikutnya.

