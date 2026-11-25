# Excel Summary

## Sheet: csms
**Columns:**
- no
- element_category
- element
- required_document
- document_format
- evaluation_criteria
- mandatory_fields
- score_0
- score_3
- score_6
- score_10
- status_accept
- status_reject
- status_revision
- validation_method
- ai_checkpoint_keywords
- document_expiry_check
- ai_confidence_threshold
- ai_reasoning_hint
- notes

**Row Count:** 29

**Sample Row:**
```json
{
  "no": 1.0,
  "element_category": "Kepemimpinan dan Komitmen*",
  "element": "Kepemimpinan dan Komitmen*",
  "required_document": "- HSE Plan project (disahkan, memuat jadwal MWT & program K3LL)\n- Prosedur Management Walkthrough (MWT)\n- Laporan/report MWT: min. 1x per project, memuat tanggal, lokasi, temuan, tanda tangan senior manajer\n- Surat delegasi MWT (jika Top Management diwakilkan)\n- MoM pertemuan management office vs tim lapangan: min. 1x/bulan, memuat agenda: ketersediaan APD, ITM peralatan, rencana rotasi crew, Ask For Help\n- Evidence HSE reward: min. 1x/tahun (sertifikat, foto, pengumuman)\n- Dokumen sosialisasi/campaign HSE (foto, absensi, materi)\n- Evidence program K3LL tambahan di luar Rencana K3LL (jika ada)",
  "document_format": "PDF, DOCX, XLSX, IMAGE, MIXED",
  "evaluation_criteria": "AI CHECKS:\n[1] Apakah HSE Plan tersedia dan memuat jadwal MWT secara eksplisit?\n[2] Apakah terdapat laporan MWT? Hitung jumlah laporan MWT vs jumlah yang dijadwalkan di HSE Plan → hitung % realisasi MWT\n[3] Apakah laporan MWT memuat: tanggal, lokasi, nama senior manajer, temuan, dan tanda tangan?\n[4] Apakah terdapat MoM pertemuan management office–lapangan? Hitung frekuensi: min. 1x/bulan → % kehadiran bulan yang terpenuhi\n[5] Apakah agenda MoM mencakup ≥3 dari 4 poin: APD, ITM peralatan, rotasi crew, Ask For Help?\n[6] Apakah terdapat evidence HSE reward dalam 12 bulan terakhir?\n[7] Apakah terdapat evidence sosialisasi/campaign HSE (foto + absensi)?\n[8] Apakah terdapat program K3LL tambahan DI LUAR yang dijadwalkan di HSE Plan? (→ syarat score 10)",
  "mandatory_fields": "- Tanggal pelaksanaan MWT\n- Nama & jabatan senior manajer yang melakukan MWT\n- Tanda tangan senior manajer di laporan MWT\n- Agenda dan kesimpulan MoM meeting office–lapangan\n- Tanda tangan peserta MoM\n- % realisasi MWT vs jadwal HSE Plan\n- % bulan yang memiliki MoM meeting",
  "score_0": "SKOR 0 — Tidak ada bukti keterlibatan senior manajemen:\n• HSE Plan tidak tersedia / tidak disahkan, DAN\n• Laporan MWT = 0 (tidak ada satu pun kunjungan terdokumentasi), ATAU\n• Tidak ada bukti apapun keterlibatan senior manajemen dalam K3LL\n\nAI DECISION: IF (HSE Plan = tidak ada) AND (laporan MWT = 0) → SKOR 0",
  "score_3": "SKOR 3 — Ada keterlibatan tapi sangat terbatas (< 50% dari yang dijadwalkan):\n• % realisasi MWT < 50% dari jadwal di HSE Plan, ATAU\n• Laporan MWT ada tapi tidak memuat tanda tangan senior manajer, ATAU\n• MoM meeting office–lapangan < 50% bulan project terpenuhi\n\nRUMUS: % realisasi MWT = (jumlah laporan MWT ada) / (jadwal MWT di HSE Plan) × 100\nAI DECISION: IF % realisasi MWT < 50% → SKOR 3",
  "score_6": "SKOR 6 — Keterlibatan konsisten sesuai Rencana K3LL (50%–99%):\n• % realisasi MWT ≥ 50% s/d < 100% dari jadwal HSE Plan, DAN\n• Laporan MWT memuat: tanggal, lokasi, nama + tanda tangan senior manajer, temuan, DAN\n• MoM meeting office–lapangan ≥ 50% s/d < 80% bulan terpenuhi, DAN\n• Agenda MoM mencakup aspek K3LL (min. 2 dari 4: APD, ITM, rotasi crew, Ask For Help)\n\nAI DECISION: IF 50% ≤ % MWT < 100% AND MoM ≥ 50% AND tanda tangan ada → SKOR 6",
  "score_10": "SKOR 10 — Melampaui Rencana K3LL (semua terpenuhi + ada tambahan):\nSYARAT WAJIB (semua harus terpenuhi):\n• % realisasi MWT = 100% dari jadwal HSE Plan\n• Setiap laporan MWT memuat: tanggal, lokasi, nama + tanda tangan senior manajer, temuan, tindak lanjut\n• MoM office–lapangan = 100% bulan terpenuhi (min. 1x/bulan)\n• Agenda MoM mencakup semua 4 poin: APD, ITM peralatan, rotasi crew, Ask For Help\n• Ada evidence HSE reward min. 1x/tahun (sertifikat/foto/pengumuman)\n• Ada evidence sosialisasi/campaign HSE (foto + absensi)\n\nSYARAT TAMBAHAN (minimal 1 harus ada):\n• Surat delegasi MWT jika Top Management diwakilkan, ATAU\n• Program K3LL tambahan DI LUAR yang dijadwalkan dalam Rencana K3LL\n\nDOKUMEN YANG HARUS DIUNGGAH:\n- HSE Plan project (disahkan, memuat jadwal MWT)\n- Prosedur MWT\n- Laporan MWT (min. 1x per project, tanda tangan senior manajer)\n- Surat delegasi MWT (jika ada)\n- MoM meeting office–lapangan (min. 1x/bulan, agenda K3LL lengkap)\n- Evidence HSE reward tahunan\n- Evidence sosialisasi/campaign HSE\n- Evidence program K3LL tambahan di luar Rencana K3LL\n\nAI DECISION: IF % MWT = 100% AND MoM = 100% AND HSE reward ada AND sosialisasi ada AND (program tambahan ATAU delegasi MWT ada) → SKOR 10",
  "status_accept": "Dokumen lengkap dan terupdate (tidak expired)",
  "status_reject": "Dokumen tidak tersedia",
  "status_revision": "Dokumen ada tetapi perlu revisi atau update",
  "validation_method": "keyword_search, section_check, signature_check, date_validation, table_check",
  "ai_checkpoint_keywords": "management walkthrough, MWT, kunjungan K3LL, HSE Plan, senior manajemen, leadership visit, MoM meeting, HSE reward, sosialisasi HSE",
  "document_expiry_check": true,
  "ai_confidence_threshold": 0.8,
  "ai_reasoning_hint": "STEP 1: Cari HSE Plan → ekstrak jadwal MWT (frekuensi per bulan/per project)\nSTEP 2: Hitung laporan MWT yang ada → hitung % realisasi = (laporan ada / jadwal) × 100\nSTEP 3: Cek tanda tangan senior manajer di tiap laporan\nSTEP 4: Hitung MoM office–lapangan → berapa bulan yang ada MoM vs total bulan project\nSTEP 5: Cek apakah ada program K3LL TAMBAHAN di luar HSE Plan → jika YA = syarat score 10\nTHRESHOLD: score 0 = 0 laporan MWT | score 3 = <50% realisasi | score 6 = 100% realisasi + MoM ≥80% | score 10 = score 6 + program tambahan",
  "notes": "Program K3LL tambahan (syarat score 10): contoh = HSE campaign tambahan, safety day, leadership HSE award di luar HSE Plan. Cek apakah MoM mencantumkan tindak lanjut (action item) yang di-follow up."
}
```

## Sheet: keterangan_kolom
**Columns:**
- Unnamed: 0
- Unnamed: 1
- Unnamed: 2
- Unnamed: 3
- Unnamed: 4

**Row Count:** 22

**Sample Row:**
```json
{
  "Unnamed: 0": NaN,
  "Unnamed: 1": null,
  "Unnamed: 2": null,
  "Unnamed: 3": null,
  "Unnamed: 4": null
}
```

## Sheet: VALIDATION_METHOD
**Columns:**
- validation_method
- Deskripsi

**Row Count:** 5

**Sample Row:**
```json
{
  "validation_method": "keyword_search",
  "Deskripsi": "AI mencari kata kunci dalam dokumen"
}
```

## Sheet: DOCUMENT_FORMAT
**Columns:**
- Format

**Row Count:** 5

**Sample Row:**
```json
{
  "Format": "PDF"
}
```

