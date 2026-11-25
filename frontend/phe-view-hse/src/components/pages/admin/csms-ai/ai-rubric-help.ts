/**
 * Help texts for the AI rubric editor (ADMIN > AI CSMS) and a client-side quality check of one element.
 * Each field: what it is, how the AI uses it, and a good example.
 */

export type FieldHelp = { label: string; section: SectionId; help: string; example?: string; rows?: number };
export type SectionId = 'identitas' | 'dokumen' | 'kriteria' | 'skor' | 'petunjuk';

export const SECTIONS: { id: SectionId; title: string; intro: string }[] = [
  { id: 'identitas', title: 'Identitas elemen', intro: 'Nama dan kategori elemen, sama dengan nama folder di penilaian kontrak.' },
  { id: 'dokumen', title: 'Dokumen yang diminta', intro: 'Dokumen yang harus diunggah kontraktor. AI memakainya untuk tahu berkas mana yang relevan dan apa yang hilang.' },
  { id: 'kriteria', title: 'Kriteria & AI CHECKS', intro: 'Bagian terpenting. AI menilai setiap Check satu per satu: TERPENUHI, SEBAGIAN, atau TIDAK, beserta kutipan bukti.' },
  { id: 'skor', title: 'Aturan skor & status', intro: 'Aturan yang mengubah hasil Check menjadi skor 0, 3, 6, atau 10 dan status Accept, Revisi, Reject.' },
  { id: 'petunjuk', title: 'Petunjuk untuk AI', intro: 'Hal tambahan: kata kunci, masa berlaku dokumen, dan cara AI menjelaskan alasannya.' },
];

export const FIELD_HELP: Record<string, FieldHelp> = {
  element_category: { label: 'Kategori elemen', section: 'identitas', help: 'Nama kategori induk (1 sampai 8). Hanya informasi.' },
  element: { label: 'Elemen', section: 'identitas', help: 'Nama elemen, sebaiknya sama dengan nama folder (tanpa nomor).', example: 'Bahaya Terhadap Lingkungan' },
  required_document: {
    label: 'Dokumen yang diperlukan', section: 'dokumen', rows: 5,
    help: 'Daftar dokumen bukti, satu per baris. Juri AI membandingkan daftar ini dengan berkas yang diunggah, lalu menulis bagian "Dokumen yang perlu dilengkapi".',
    example: '- HIRADC aspek lingkungan (disahkan manajemen)\n- SOP pengelolaan sampah & limbah B3\n- Record of Garbage Discharge (marine)',
  },
  document_format: { label: 'Format dokumen', section: 'dokumen', help: 'Format atau nomor form yang diharapkan (mis. F/QHSE/19). Membantu AI mengenali dokumen walau nama berkas berbeda.' },
  mandatory_fields: { label: 'Isian wajib', section: 'dokumen', rows: 3, help: 'Kolom yang wajib ada di dokumen (tanda tangan, tanggal, nomor revisi). AI memeriksa kolom ini saat membaca bukti.' },
  evaluation_criteria: {
    label: 'Kriteria evaluasi (AI CHECKS)', section: 'kriteria', rows: 12,
    help: 'Tulis satu Check per baris dengan format [Check_NN_Nama][Kelas]: lalu apa yang harus terlihat di dokumen. Kelas: [Wajib] tanpa ini skor paling tinggi 3; [Utama] menentukan skor 6; [Pendukung] hanya membedakan 6 dan 10. Tulis kondisi yang DIHARAPKAN (mis. "tidak terdapat sanksi"), jangan kondisi buruk yang dicari.',
    example: '[Check_01_Environmental_HIRADC][Wajib]: HIRADC lingkungan mencakup emisi, limbah padat/cair, kebisingan; disahkan manajemen.\n[Check_09_Environmental_Awards][Pendukung]: Sertifikat PROPER/penghargaan lingkungan 5 tahun terakhir.',
  },
  validation_method: { label: 'Metode validasi', section: 'kriteria', rows: 3, help: 'Cara memeriksa (hitung persentase, cocokkan nama, cek tanggal). AI mengikuti metode ini saat menilai Check.' },
  score_0: { label: 'Skor 0', section: 'skor', rows: 4, help: 'Kapan skor 0. Biasanya: tidak ada dokumen bukti sama sekali.' },
  score_3: { label: 'Skor 3', section: 'skor', rows: 4, help: 'Dokumen ada, tetapi ada Check [Wajib] yang TIDAK atau Check [Utama] sebagian besar belum terpenuhi. Status: Revisi.' },
  score_6: { label: 'Skor 6', section: 'skor', rows: 4, help: 'Tidak ada Check [Wajib] yang TIDAK dan minimal 60% Check [Utama] terpenuhi/sebagian. Check [Pendukung] tidak dipersyaratkan.' },
  score_10: { label: 'Skor 10', section: 'skor', rows: 4, help: 'Semua Check [Wajib] dan [Utama] TERPENUHI, dan minimal separuh Check [Pendukung] TERPENUHI.' },
  status_accept: { label: 'Status Accept', section: 'skor', rows: 2, help: 'Kapan status Accept (umumnya skor 6 dan 10).' },
  status_revision: { label: 'Status Revisi', section: 'skor', rows: 2, help: 'Kapan status Revisi (umumnya skor 3: ada bukti inti yang masih kurang).' },
  status_reject: { label: 'Status Reject', section: 'skor', rows: 2, help: 'Kapan status Reject (umumnya skor 0).' },
  ai_checkpoint_keywords: { label: 'Kata kunci checkpoint AI', section: 'petunjuk', rows: 3, help: 'Istilah dan sinonim yang membantu AI menemukan bukti (mis. "SWA, Stop Work Authority").' },
  document_expiry_check: { label: 'Pemeriksaan masa berlaku', section: 'petunjuk', rows: 3, help: 'Dokumen mana yang punya masa berlaku dan berapa lama. AI menurunkan nilai Check bila dokumen kedaluwarsa.' },
  ai_confidence_threshold: { label: 'Ambang keyakinan AI', section: 'petunjuk', help: 'Keyakinan minimum. Di bawah 0,85 hasil ditandai "Perlu tinjauan".', example: '0.85' },
  ai_reasoning_hint: { label: 'Petunjuk penalaran AI', section: 'petunjuk', rows: 4, help: 'Cara AI menjelaskan alasan: apa yang perlu disebut, istilah yang dipakai, hal yang harus dihindari.' },
  notes: { label: 'Catatan', section: 'petunjuk', rows: 4, help: 'Catatan umum untuk semua juri (mis. sinonim agenda rapat, aturan khusus marine).' },
};

export type LintIssue = { level: 'ok' | 'warn'; text: string };

/** Quality check of one rubric element (shown live while editing). */
export const lintRubricItem = (item: Record<string, string>) => {
  const crit = item.evaluation_criteria ?? '';
  const checks = [...crit.matchAll(/\[(Check_[^\]]+)\](\[(Wajib|Utama|Pendukung)\])?/g)];
  const issues: LintIssue[] = [];
  const add = (ok: boolean, okText: string, warnText: string) => issues.push(ok ? { level: 'ok', text: okText } : { level: 'warn', text: warnText });

  add(checks.length >= 3, `${checks.length} label Check ditemukan`, `Hanya ${checks.length} label [Check_..]; tulis minimal 3 agar penilaian rinci`);
  const unclassed = checks.filter((c) => !c[3]).map((c) => c[1]);
  add(!unclassed.length, 'Semua Check punya kelas Wajib/Utama/Pendukung', `Belum ada kelas pada ${unclassed.length} Check: ${unclassed.slice(0, 3).join(', ')}`);
  add(checks.some((c) => c[3] === 'Wajib'), 'Ada Check [Wajib]', 'Belum ada Check [Wajib]; tentukan bukti inti elemen ini');
  const missingScores = ['score_0', 'score_3', 'score_6', 'score_10'].filter((k) => !(item[k] ?? '').trim());
  add(!missingScores.length, 'Aturan skor 0/3/6/10 terisi', `Aturan skor kosong: ${missingScores.map((k) => k.replace('score_', '')).join(', ')}`);
  add(!!(item.required_document ?? '').trim(), 'Dokumen yang diperlukan terisi', 'Isi "Dokumen yang diperlukan" agar AI tahu berkas yang hilang');
  // checks phrased as "find the bad thing" are read the wrong way round (e.g. 6.5 Check_05 before calibration)
  const inverted = checks.filter((c) => {
    const body = crit.slice(c.index! + c[0].length, crit.indexOf('[Check_', c.index! + 1) > 0 ? crit.indexOf('[Check_', c.index! + 1) : undefined);
    return /(deteksi|cari)\s+(keberadaan\s+)?(dokumen\s+)?(sanksi|denda|pelanggaran|teguran)/i.test(body) && !/TERPENUHI bila/i.test(body);
  });
  add(!inverted.length, 'Tidak ada Check yang mudah terbaca terbalik',
    `${inverted.map((c) => c[1]).join(', ')} mencari hal buruk (sanksi/denda); tulis sebagai kondisi yang diharapkan dan sebutkan "TERPENUHI bila ..."`);
  const ruleText = ['score_3', 'score_6', 'score_10'].map((k) => item[k] ?? '').join(' ');
  add(/Wajib|Utama|Pendukung|Check_/i.test(ruleText), 'Aturan skor merujuk ke Check/kelas Check', 'Aturan skor belum merujuk ke kelas Check; AI sulit menghubungkan Check dengan skor');

  const score = Math.round((issues.filter((i) => i.level === 'ok').length / issues.length) * 10);
  return { score, issues, checks: checks.map((c) => ({ label: c[1], cls: (c[3] as string) || null })) };
};

/** What the AI jurors receive for this element (mirrors csms-ai server/rubric.py juror_view). */
export const jurorPreview = (item: Record<string, string>) =>
  [
    ['ELEMEN', `${item.no} ${item.element ?? ''}`],
    ['DOKUMEN YANG DIPERLUKAN', item.required_document],
    ['KRITERIA EVALUASI (AI CHECKS)', item.evaluation_criteria],
    ['ATURAN SKOR', ['0', '3', '6', '10'].map((s) => `Skor ${s}: ${item[`score_${s}`] ?? '-'}`).join('\n\n')],
    ['ATURAN STATUS', `Accept: ${item.status_accept ?? '-'}\nRevisi: ${item.status_revision ?? '-'}\nReject: ${item.status_reject ?? '-'}`],
    ['MASA BERLAKU', item.document_expiry_check],
    ['PETUNJUK PENALARAN', item.ai_reasoning_hint],
    ['CATATAN', item.notes],
  ]
    .filter(([, v]) => (v ?? '').trim())
    .map(([k, v]) => `${k}\n${v}`)
    .join('\n\n');
