# Panduan Standar Metrik HSE & Rencana Peningkatan (Room of Improvement)

## Evaluasi Komparatif Sistem Eksisting vs. Standar Industri (IOGP, OSHA, SKK Migas, Pertamina)

---

## 1. Eksekutif Ringkasan (Executive Summary)

Dokumen ini disusun sebagai **landasan strategis dan teknis** untuk pengembangan modul **HSE Performance Dashboard** pada aplikasi PHE View HSE.

Tujuan utama dokumen ini adalah memberikan analisis mendalam mengenai:

1. Perbandingan antara **logika perhitungan yang saat ini berjalan di sistem eksisting** dengan **standar kelaziman industri minyak & gas bumi global dan nasional** (_IOGP - International Association of Oil & Gas Producers_, _OSHA 1904_, _Pedoman Tata Kerja SKK Migas_, dan _Sistem Manajemen HSSE Pertamina_).
2. Mengidentifikasi celah (_gaps_) dan distorsi statistik yang timbul dari model kalkulasi saat ini.
3. Memberikan rekomendasi konkret (_room of improvement_) dan peta jalan (_roadmap_) transformasi logika perhitungan metrik keselamatan kerja agar menjadi lebih presisi, dapat diaudit (_auditable_), dan memberikan wawasan prediktif (_predictive safety insights_) bagi manajemen.

---

## 2. Taksonomi Indikator Keselamatan Kerja (HSE Indicators Taxonomy)

Dalam manajemen keselamatan kerja modern, pemantauan kinerja dibagi menjadi dua pilar utama yang saling melengkapi:

```
+-------------------------------------------------------------------------------+
|                             HSE PERFORMANCE MATRIX                             |
+-------------------------------------------------------------------------------+
|  LEADING INDICATORS (PROAKTIF / INPUT)        LAGGING INDICATORS (REAKTIF / OUTPUT)|
|  - Smart Card / KTA-TTA Observation Rate      - Fatality & Lost Time Injury (LTI) |
|  - Hazard Hunt & Near Miss Reporting          - Restricted Work Day Case (RWDC)   |
|  - HSE Meeting & Toolbox Meeting Rate         - Medical Treatment Case (MTC)      |
|  - HSE Inspection & Audit Compliance          - First Aid Case (FAC)              |
|  - Emergency Drill Execution vs Plan          - TRIR & LTIFR Incident Rates       |
|  - Action Item Closure Time & Rate            - Free LTA / Free RI Calendar Days  |
+-------------------------------------------------------------------------------+
```

### A. Leading Indicators (Indikator Kinerja Proaktif)

- **Tujuan**: Mengukur efektivitas intervensi preventif, kepatuhan proses, serta partisipasi aktif seluruh lini organisasi sebelum insiden terjadi.
- **Fokus**: Input proses (pelatihan, inspeksi, kartu observasi, mitigasi risiko).
- **Prinsip Dasar**: Semakin tinggi kualitas dan kuantitas observasi serta penutupan temuan proaktif, semakin kecil probabilitas terjadinya insiden besar (_zero incident target_).

### B. Lagging Indicators (Indikator Kinerja Reaktif)

- **Tujuan**: Mengukur dampak, konsekuensi, atau kerugian nyata dari kegagalan sistem proteksi keselamatan yang telah terjadi.
- **Fokus**: Output kejadian (insiden cedera, kerusakan properti, pencemaran lingkungan).
- **Prinsip Dasar**: Menggunakan _Piramida Keselamatan Kerja_ (_Heinrich / Bird Safety Pyramid_) untuk mengevaluasi rasio keparahan insiden.

---

## 3. Analisis Celah Komparatif: Sistem Eksisting vs. Standar Industri

Berikut adalah pembedahan mendalam terhadap masing-masing metrik yang terdapat pada dashboard HSE Performance:

---

### A. Total Recordable Incident Rate (TRIR)

#### 1. Praktik Sistem Eksisting Saat Ini

- **Formula**:
  $$\text{TRIR} = \frac{(\text{Fatality} + \text{LTI} + \text{RWDC} + \text{MTC}) \times 200.000}{\text{Total Safe Manhours}}$$
- **Celah / Distorsi Logika**:
  1. **Penyebut Menggunakan _Safe Manhours_ Bukan _Actual Exposure Hours_:**  
     Jika terjadi LTI atau Fatality, sistem mereset _Safe Manhours_ menjadi 0 atau angka yang sangat kecil. Akibatnya, nilai penyebut runtuh mendekati nol dan menghasilkan lonjakan TRIR yang tidak rasional ($\to \infty$), bahkan _division by zero_.
  2. **Konstanta Pengali:**  
     Standar OSHA menggunakan $200.000$ (ekuivalen dengan $100$ pekerja purnawaktu dalam setahun). Namun, dalam industri hulu migas internasional (IOGP 453), standar yang lazim digunakan adalah $1.000.000$ manhours.

#### 2. Standar Kelaziman Industri (IOGP Report 453 & OSHA 1904)

- **Formula Baku**:
  $$\text{TRIR} = \frac{\text{Total Recordable Cases (TRC)} \times 1.000.000}{\text{Total Actual Exposure Manhours in Period}}$$
  _Catatan: Jika menggunakan basis regulasi US OSHA, gunakan pengali $200.000$, namun penyebut WAJIB seluruh jam kerja nyata pada periode tersebut._
- **Karakteristik Utama**:
  - $\text{TRC} = \text{Fatality} + \text{Lost Workday Cases (LTI)} + \text{Restricted Workday Cases (RWDC)} + \text{Medical Treatment Cases (MTC)}$.
  - Penyebut **tidak pernah di-reset** ketika insiden terjadi, karena merefleksikan total paparan jam kerja nyata (_actual exposure_) dari seluruh tenaga kerja dalam rentang waktu evaluasi.

---

### B. Lost Time Injury Frequency Rate (LTIFR) & Lost Time Injury Severity Rate (LTISR)

#### 1. Kondisi Sistem Eksisting

- Saat ini metrik LTIFR dan LTISR belum dipisahkan secara eksplisit pada kartu metrik utama dashboard (hanya diwakili oleh TRIR).

#### 2. Standar Kelaziman Industri (IOGP & SKK Migas)

- **Lost Time Injury Frequency Rate (LTIFR)**:
  $$\text{LTIFR} = \frac{(\text{Fatality} + \text{LTI}) \times 1.000.000}{\text{Total Actual Exposure Manhours in Period}}$$
  _Mengukur frekuensi kejadian kecelakaan yang menyebabkan kehilangan hari kerja per 1 juta jam kerja._
- **Lost Time Injury Severity Rate (LTISR)**:
  $$\text{LTISR} = \frac{\text{Total Lost Workdays (Hari Kerja Hilang)} \times 1.000.000}{\text{Total Actual Exposure Manhours in Period}}$$
  _Mengukur tingkat keparahan dampak cedera berdasarkan total hari kerja yang hilang._

---

### C. Hari Bebas Kecelakaan: Free LTA (Days) vs. Free RI (Days)

#### 1. Praktik Sistem Eksisting Saat Ini

- **Logika Perhitungan**:
  Sistem menjumlahkan total hari kerja tanpa insiden dari masing-masing proyek secara terpisah (_running days_):
  $$\text{Free Days} = \sum \text{Project Running Days} + \sum \text{Marine Vessel Running Days}$$
- **Celah / Distorsi Logika**:
  1. **Distorsi Multiplikasi Entitas:**  
     Jika perusahaan memiliki 50 proyek aktif yang berjalan serentak selama 30 hari kalender, penjumlahan matematika menghasilkan $50 \times 30 = 1.500$ hari. Nilai ini bukan hari kalender yang sebenarnya dijalani perusahaan.
  2. **Ekuivalensi Nilai LTA dan RI:**  
     Secara historis nilai Free LTA dan Free RI sering disamakan. Padahal, jika terjadi insiden ringan berstatus _Medical Treatment Case_ (MTC), hari bebas RI harus di-reset, sedangkan hari bebas LTA tetap berjalan karena tidak ada korban yang kehilangan hari kerja.

#### 2. Standar Kelaziman Industri (Safe Operating Days)

- **Definisi Standar**:
  Hari bebas kecelakaan adalah **selisih hari kalender murni** (_elapsed calendar days_) sejak tanggal insiden terakhir yang relevan hingga tanggal evaluasi hari ini:
  $$\text{Safe Calendar Days} = \text{Tanggal Evaluasi} - \text{Tanggal Insiden Terakhir}$$
- **Pemisahan Kriteria Reset**:
  - **Free LTA Days (Lost Time Accident Free Days)**:
    - Hanya di-reset jika terjadi **Fatality** atau **Lost Time Injury (LTI)**.
    - Menghitung durasi kalender di mana tidak ada personil yang mengalami kecelakaan fatal atau kehilangan waktu kerja.
  - **Free RI Days (Recordable Incident Free Days)**:
    - Di-reset jika terjadi **Fatality**, **LTI**, **Restricted Workday Case (RWDC)**, ATAU **Medical Treatment Case (MTC)**.
    - Jika terjadi kasus MTC pada tanggal 20 September 2026:
      - $\text{Free RI} = 0 \text{ Hari}$ (reset seketika).
      - $\text{Free LTA} = \text{Tetap berjalan bertambah}$ (tidak terpengaruh MTC).
- **Tingkatan Pelaporan**:
  - Dihitung pada level **Perusahaan / Wilayah Operasi** (_Enterprise / Field Level_), bukan penjumlahan matematis antar proyek.
  - Jika ingin menampilkan performa masing-masing proyek, tampilkan sebagai **tabel komparasi per proyek/vessel** (_Asset Leaderboard_), bukan dijumlahkan menjadi satu angka global.

---

### D. Total Safe Manhours (Jam Kerja Selamat)

#### 1. Praktik Sistem Eksisting Saat Ini

- Sistem mengagregasi total manhours yang dicatat dalam log manhours.
- Pada perbaikan terakhir, sistem telah menerapkan pemotongan (_reset cutoff_) setelah tanggal Fatality/LTI terakhir.

#### 2. Standar Kelaziman Industri

- **Pembedaan Dua Jenis Jam Kerja**:
  1. **Total Actual Exposure Manhours (Total Jam Kerja Nyata)**:
     - Akumulasi seluruh jam kerja seluruh personil (PHE OSES + Kontraktor + Subkontraktor + Kru Kapal) dalam periode kalender tertentu.
     - Nilai ini **tidak pernah di-reset** oleh insiden apapun.
     - Digunakan sebagai dasar pembagi rasio TRIR, LTIFR, dan audit ketenagakerjaan.
  2. **Total Safe Manhours without LTI (Jam Kerja Selamat Bebas LTI)**:
     - Akumulasi jam kerja nyata yang berhasil dilalui tanpa adanya kecelakaan fatal ataupun insiden LTI.
     - Di-reset menjadi $0$ tepat pada tanggal terjadinya Fatality atau LTI, lalu diakumulasikan kembali sejak tanggal tersebut hingga hari ini.

---

### E. Leading Indicators (Indikator Kinerja Proaktif)

Saat ini dashboard menampilkan 5 kartu metrik leading:

1. **KARPIT (Kartu Pintar / Hazard Observation)**
2. **Meeting (Toolbox meeting, HSE meeting)**
3. **Drill (Latihan Tanggap Darurat)**
4. **Inspection (Inspeksi HSE & Fasilitas)**
5. **Training (Pelatihan & Sosialisasi K3L)**

#### 1. Praktik Sistem Eksisting

- Menampilkan jumlah kuantitatif mutlak (_raw counts_) untuk periode harian (_Day_) dan akumulasi tahun berjalan (_YTD_).

#### 2. Celah / Keterbatasan

- **Tidak Mengukur Rasio Partisipasi & Efektivitas**:
  Angka mutlak (misal $344$ kartu pintar) tidak dapat menginformasikan apakah tingkat partisipasi pelaporan sehat atau rendah. Misalnya, $344$ kartu untuk $10.000$ pekerja berarti partisipasi sangat minim ($0,03$ laporan per orang), sedangkan untuk $50$ pekerja berarti budaya pelaporannya sangat masif.
- **Risiko "Greenwashing" Safety**:
  Banyaknya laporan tidak bermakna positif jika temuan-temuan berbahaya (_unsafe condition / action_) tersebut tidak pernah diselesaikan (_action item closure rate rendah_).

#### 3. Standar Kelaziman Industri (IOGP Report 459 - Leading Indicators)

Metrik leading yang berstandar internasional harus menyajikan **rasio kepatuhan dan efektivitas**:

1. **Observation Frequency Rate (Tingkat Pelaporan Observasi)**:
   $$\text{Reporting Rate} = \frac{\text{Jumlah Kartu Observasi}}{\text{Total Personil}} \quad \text{atau} \quad \frac{\text{Jumlah Kartu Observasi} \times 200.000}{\text{Total Exposure Hours}}$$
2. **Action Item Closure Rate (% Penyelesaian Tindak Lanjut)**:
   $$\text{Closure Rate} = \frac{\text{Temuan Berstatus Selesai (Closed)}}{\text{Total Temuan Terbuka (Open + Closed)}} \times 100\%$$
   _Dilengkapi rata-rata durasi penyelesaian (Mean Time to Close)._
3. **Drill Compliance Rate (% Kepatuhan Latihan Tanggap Darurat)**:
   $$\text{Drill Compliance} = \frac{\text{Realisasi Drill Dilaksanakan}}{\text{Target Matriks Latihan Tahunan}} \times 100\%$$
4. **HSE Mandatory Training Matrix Compliance**:
   $$\text{Training Compliance} = \frac{\text{Pekerja dengan Sertifikat/Pelatihan Masih Valid}}{\text{Total Pekerja Wajib Sertifikasi}} \times 100\%$$
5. **Leading-to-Lagging Reporting Ratio**:
   - Membandingkan jumlah laporan Near Miss / Unsafe Condition terhadap total kecelakaan nyata. Rasio yang sehat adalah $100 - 300$ laporan bahaya/hampir celaka untuk setiap $1$ insiden medis. Jika rasio mendekati nol, mengindikasikan adanya ketakutan melapor (_under-reporting culture_).

---

## 4. Matriks Komparasi Rinci (Detailed Comparison Matrix)

| Dimensi Metrik          | Praktik Sistem Saat Ini                                                      | Standar Internasional (IOGP / OSHA / SKK Migas)                                                                                      | Implikasi & Rekomendasi Roadmap                                                                                   |
| :---------------------- | :--------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------- |
| **TRIR**                | Menggunakan konstanta $200.000$, penyebut sempat terikat ke _Safe Manhours_. | $\frac{\text{TRC} \times 1.000.000}{\text{Total Actual Exposure Hours}}$ (atau $200.000$ OSHA). Penyebut WAJIB total exposure nyata. | Pisahkan kalkulasi penyebut: jangan pernah gunakan jam selamat sebagai pembagi TRIR.                              |
| **Free LTA Days**       | Penjumlahan _running safe days_ per proyek/vessel ($\sum \text{days}$).      | Selisih hari kalender sejati sejak Fatality/LTI terakhir di tingkat entitas operasi.                                                 | Sediakan 2 sudut pandang: **Hari Kalender Operasi** di header utama, dan **Leaderboard Proyek** di tabel rincian. |
| **Free RI Days**        | Cenderung disamakan dengan LTA; baru dipisahkan secara parsial.              | Dihitung dari Fatality, LTI, RWDC, dan MTC. Reset seketika saat ada MTC (meski LTA tetap jalan).                                     | Terapkan pemisahan pemicu reset: MTC hanya mereset RI, tidak mereset LTA.                                         |
| **Total Safe Manhours** | Total akumulasi jam kerja selamat dengan sistem reset LTI/Fatality.          | Jam kerja selamat terhitung sejak LTI terakhir; dipisahkan dengan Total Actual Manhours.                                             | Tetap pertahankan jam selamat, namun sediakan pula metrik Total Actual Manhours tanpa reset.                      |
| **Leading Indicators**  | Jumlah mutlak (_raw count_) harian dan tahun berjalan (Day \| YTD).          | Rasio partisipasi pekerja, persentase penutupan temuan (_closure rate_), dan kepatuhan jadwal.                                       | Tambahkan indikator kualitas: persentase tindakan tertutup (_close rate %_) dan rasio per pekerja.                |
| **Piramida Insiden**    | Perbandingan Produksi vs Marine berdasarkan jenis laporan harian.            | _Heinrich / Bird Safety Pyramid_ berjenjang: Fatality $\to$ LTI $\to$ RWDC $\to$ MTC $\to$ First Aid $\to$ Near Miss $\to$ UA/UC.    | Sistem saat ini sudah sangat baik dan sesuai hierarki, tinggal menambahkan fitur analisis tren bulanan.           |
| **Pemisahan Jam Kerja** | Konfigurasi jam standar 12 jam (PHE OSES vs Kontraktor) pada project.        | Jam shift nyata onshore (8-12 jam) vs offshore marine (24 jam operasional kapal, 12 jam/kru).                                        | Integrasikan kalkulasi otomatis dari absensi POB nyata secara dinamis per shift kerja.                            |

---

## 5. Peta Jalan Peningkatan (Actionable Room of Improvement)

Untuk meningkatkan kapabilitas sistem analitik HSE ini ke tingkat _enterprise-grade_, berikut tahapan rekomendasi implementasi yang dapat dipertimbangkan oleh manajemen dan pemangku kepentingan:

### Fase 1: Standardisasi Tata Kelola Metrik Dasar (Jangka Pendek)

1. **Pemisahan Parameter Pembagi TRIR**:
   - Pastikan rumus TRIR pada backend selalu menggunakan parameter `total_exposure_manhours_all` (jam kerja nyata periode evaluasi) sebagai penyebut, dan bukan jam kerja selamat.
2. **Standardisasi Dualisme Tampilan Hari Bebas Kecelakaan**:
   - Pada kartu metrik utama di dashboard, tampilkan **Hari Kalender Operasi Bebas Kecelakaan** (_Operating Calendar Days without LTA/RI_), misal: "_23 Hari Kalender Bebas RI_" dan "_1.632 Hari Bebas LTA_".
   - Sediakan tombol ekspansi (_accordion / modal_) untuk melihat akumulasi jam/hari kerja selamat per masing-masing fasilitas/kapal (_Asset Breakdown_).
3. **Pembedaan Tegas LTA vs. RI**:
   - Dokumentasikan secara resmi kepada pengguna akhir bahwa Free LTA hanya memperhitungkan Fatality dan LTI, sedangkan Free RI memperhitungkan seluruh _Recordable Cases_ termasuk pengobatan medis (MTC).

### Fase 2: Peningkatan Kualitas Leading Indicators (Jangka Menengah)

1. **Integrasi Status Tindak Lanjut (_Action Tracking_)**:
   - Tidak hanya menghitung berapa kartu pintar atau temuan inspeksi yang dicatat, tetapi tambahkan metrik **% Closed on Time** (persentase temuan yang berhasil diselesaikan tepat waktu sesuai target PIC).
2. **Normalisasi Observasi per Kapita**:
   - Tampilkan rasio: $\frac{\text{Total Kartu Observasi}}{\text{Rata-rata POB Aktif}}$. Rasio ini memberikan gambaran yang adil (_fair comparison_) antara proyek beranggotakan 200 orang dengan proyek beranggotakan 15 orang.
3. **Penyelarasan Matriks Pelatihan (Training Matrix Compliance)**:
   - Hubungkan modul pelatihan dengan masa berlaku sertifikasi personil untuk memunculkan indikator peringatan dini (_early warning indicator_) personil yang sertifikasinya akan habis dalam 30-60 hari ke depan.

### Fase 3: Prediktif & Advanced Safety Analytics (Jangka Panjang)

1. **Safety Climate Index (Indeks Iklim Keselamatan)**:
   - Menggabungkan skor dari 5 leading indicators menjadi satu nilai indeks kesehatan HSE (skor 0 - 100) per lokasi kerja.
2. **Korelasi Piramida Insiden Otomatis (Heinrich Anomaly Detection)**:
   - Sistem memberikan notifikasi peringatan jika ada lokasi kerja yang jam kerjanya tinggi tetapi pelaporan observasi/near-miss bernilai nol (mengindikasikan bahaya tersembunyi / _hidden risk_ akibat keengganan melapor).
3. **Pelaporan Terintegrasi Ekspor Formal (SKK Migas / Ditjen Migas Format)**:
   - Menyediakan generator laporan otomatis berkala (mingguan/bulanan) yang langsung sesuai dengan format formulir standar SKK Migas dan Ditjen Migas.

---

## 6. Formula Matematis Standar Industri (Referensi Teknis Pengembang)

Berikut adalah ringkasan rumus baku yang direkomendasikan untuk pengembangan arsitektur database dan service backend di masa mendatang:

```typescript
// 1. Total Actual Exposure Manhours (Jam Kerja Nyata Periode)
TotalExposureHours = Sum(EmployeeLogManhours) + Sum(ContractorLogManhours) + Sum(MarineCrewLogManhours);

// 2. Total Safe Manhours (Jam Kerja Selamat)
LastLtiDate = QueryLastIncidentDate(['fatality', 'lti']);
SafeManhours = Sum(ActualExposureHours WHERE WorkDate > LastLtiDate AND WorkDate <= EvaluationDate);

// 3. Total Recordable Incident Rate (TRIR - Standard IOGP 1 Juta Jam)
TotalRecordableCases = FatalityCount + LtiCount + RwdcCount + MtcCount;
TRIR = (TotalRecordableCases * 1_000_000) / TotalExposureHours;

// 4. Lost Time Injury Frequency Rate (LTIFR - Standard IOGP 1 Juta Jam)
LostTimeCases = FatalityCount + LtiCount;
LTIFR = (LostTimeCases * 1_000_000) / TotalExposureHours;

// 5. Free LTA Days (Hari Kalender Bebas Kecelakaan Fatal & Hilang Hari Kerja)
LastLtaDate = QueryLastIncidentDate(['fatality', 'lti']);
FreeLtaDays = DateDiffInDays(EvaluationDate, LastLtaDate ?? InitialFacilityStartDate);

// 6. Free RI Days (Hari Kalender Bebas Kejadian Recordable Termasuk MTC)
LastRiDate = QueryLastIncidentDate(['fatality', 'lti', 'restrictedWorkDayCase', 'medicalTreatmentCase']);
FreeRiDays = DateDiffInDays(EvaluationDate, LastRiDate ?? InitialFacilityStartDate);

// 7. Hazard Observation Reporting Rate (Per 100 Pekerja)
ObservationRate = (TotalSmartCardsReported / AverageActivePersonnelCount) * 100;

// 8. Action Item Closure Rate (%)
ClosureRate = (ClosedFindingsCount / TotalFindingsCount) * 100;
```

---

## 7. Kesimpulan & Panduan Keputusan Stakeholder

1. **Stabilitas Sistem Saat Ini**:  
   Sistem yang berjalan saat ini telah berhasil menyajikan data secara stabil, responsif, dan telah mengakomodasi kebutuhan operasional pengguna (termasuk pemisahan Piramida Produksi vs Marine, penanganan reset insiden, penyingkatan filter interaktif, dan filter parameter proyek).
2. **Kesiapan Menuju Standar Internasional**:  
   Adopsi formula standar industri (seperti yang dijabarkan dalam dokumen ini) dapat dilakukan secara bertahap tanpa merusak kebiasaan kerja pengguna yang sudah berjalan. Pemangku kepentingan dapat menggunakan dokumen ini sebagai panduan formal saat merumuskan _Key Performance Indicators_ (KPI) HSSE korporat di masa mendatang.
