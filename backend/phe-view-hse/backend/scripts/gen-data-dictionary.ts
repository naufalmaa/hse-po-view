// npx tsx scripts/gen-data-dictionary.ts
// Membaca katalog PostgreSQL dari DB di env (pakai DB yang skemanya baru disinkronkan, mis. hasil `npm run schema:dump`)
// lalu menulis docs/handover/database/KAMUS-DATA.md dan ERD.md (diagram Mermaid per domain).
// Deskripsi tabel ditulis manual di DOMAINS di bawah; kolom, tipe, relasi, dan indeks diambil otomatis.
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import env from '../src/config/env.config.ts';

type Domain = { key: string; title: string; intro: string; tables: Record<string, string> };

const DOMAINS: Domain[] = [
  {
    key: 'auth',
    title: 'Autentikasi, pengguna, dan master data',
    intro: 'Akun login (Better Auth), peran pengguna, dan data master kontraktor, kapal, dan lokasi.',
    tables: {
      users: 'Pengguna aplikasi. Kolom `role` (enum UserRole) menentukan menu dan hak akses.',
      accounts: 'Kredensial login Better Auth per pengguna. `password` berisi hash scrypt (salt:key), bukan teks asli.',
      sessions: 'Sesi login aktif (token cookie), dengan IP dan user agent.',
      verification: 'Token verifikasi Better Auth (reset password, verifikasi email).',
      sub_contractors: 'Master perusahaan kontraktor.',
      vessels: 'Master kapal.',
      contractor_vessels: 'Relasi banyak-ke-banyak kontraktor dan kapal.',
      user_contractors: 'Pemetaan pengguna ke kontraktor/kapal yang boleh diakses.',
      locations: 'Master lokasi (koordinat) untuk cuaca dan lokasi kerja.',
      user_alarm_log: 'Log notifikasi/alarm yang ditujukan ke pengguna.',
    },
  },
  {
    key: 'report',
    title: 'Proyek dan laporan harian (Daily Report)',
    intro: 'Satu laporan harian per lokasi kerja per tanggal, dengan 14 tabel detail.',
    tables: {
      subtypes: 'Proyek / sub-tipe pekerjaan. Kolom `extra` (JSON) menyimpan pengaturan proyek, mis. autoCalculateManhours.',
      work_locations: 'Lokasi kerja di bawah satu proyek.',
      daily_reports: 'Header laporan harian (tanggal, lokasi kerja, pembuat, status).',
      daily_report_subtypes: 'Relasi laporan harian ke proyek.',
      report_manhours: 'Jam kerja (manhours) pada laporan.',
      report_lagging_indicators: 'Indikator lagging HSE (insiden, kecelakaan, dsb.).',
      report_highlights: 'Sorotan / catatan penting laporan.',
      report_meetings: 'Kegiatan rapat / safety meeting.',
      report_drills: 'Kegiatan drill / latihan keadaan darurat.',
      report_trainings: 'Kegiatan pelatihan.',
      report_inspections: 'Kegiatan inspeksi.',
      report_smart_cards: 'Ringkasan kartu pintar (observasi keselamatan) pada laporan.',
      report_permits: 'Izin kerja (Permit to Work) pada laporan.',
      report_operations: 'Ringkasan kegiatan operasi.',
      report_vessels_under_po_summary: 'Ringkasan kapal di bawah PO.',
      report_files: 'Lampiran berkas laporan; terhubung ke detail (rapat, drill, pelatihan, inspeksi, izin).',
      report_weather_sealevel: 'Data cuaca dan tinggi muka laut harian (diisi job terjadwal).',
    },
  },
  {
    key: 'employee',
    title: 'Karyawan, absensi, dan kartu pintar',
    intro: 'Data personel kontraktor, dokumen kepegawaian, absensi/POB, dan observasi kartu pintar.',
    tables: {
      employees: 'Master karyawan (kontraktor, kapal, proyek).',
      employee_status: 'Riwayat status siklus karyawan (on duty, off, dsb.).',
      attendance: 'Absensi harian karyawan per lokasi kerja.',
      employee_bpjs: 'Data BPJS karyawan.',
      employee_certificates: 'Sertifikat kompetensi karyawan beserta masa berlaku.',
      employee_contracts: 'Kontrak kerja karyawan.',
      employee_mcus: 'Hasil Medical Check Up beserta masa berlaku.',
      employee_sika: 'Data SIKA (surat izin kerja area).',
      employee_vaccinations: 'Data vaksinasi.',
      employee_files: 'Berkas dokumen karyawan; terhubung ke tabel dokumen di atas.',
      employee_alarm_log: 'Log alarm dokumen karyawan yang mendekati/lewat masa berlaku.',
      smart_card_observations: 'Observasi kartu pintar (perilaku aman/tidak aman) per karyawan.',
      upload_history: 'Riwayat unggah berkas massal (Excel) dan ringkasan hasilnya.',
      upload_observation_errors: 'Baris yang gagal pada unggahan massal.',
      pob_unmatched_logs: 'Log data POB yang tidak cocok dengan master karyawan.',
    },
  },
  {
    key: 'manhours',
    title: 'Log manhours',
    intro: 'Rekap jam kerja harian per proyek/lokasi/kontraktor/kapal, diisi job terjadwal.',
    tables: {
      log_manhours: 'Rekap manhours harian. Keunikan dijaga 3 partial unique index (lihat kolom Indeks).',
    },
  },
  {
    key: 'csms',
    title: 'CSMS (Contractor Safety Management System)',
    intro: 'Kontrak, folder penilaian berjenjang (ltree), approval, dan log terkait.',
    tables: {
      csms_guideline: 'Dokumen pedoman CSMS.',
      csms_qualification_assessment: 'Penilaian kualifikasi (prakualifikasi) kontraktor.',
      csms_risk_assessment: 'Penilaian risiko kontraktor.',
      csms_file: 'Berkas pendukung pedoman, kualifikasi, dan penilaian risiko.',
      csms_contract: 'Kontrak CSMS per kontraktor/kapal.',
      csms_contract_folder: 'Pohon folder dan berkas penilaian kontrak. `path` (ltree) menyimpan hierarki; kolom `ai_*` menyimpan hasil AI.',
      csms_approval_log: 'Riwayat approval/penilaian folder oleh evaluator/verifikator.',
      csms_alarm_log: 'Log alarm kontrak (mis. masa berlaku).',
      csms_evaluation_email_log: 'Log email notifikasi hasil evaluasi.',
    },
  },
  {
    key: 'csmsai',
    title: 'CSMS AI',
    intro: 'Antrian penilaian AI, knowledge base, rubric, dan hasil uji coba. Tabel rubric/trial dibuat oleh csms-ai.',
    tables: {
      csms_ai_evaluation_job: 'Antrian/job penilaian AI per folder (status, mode fast/thorough, progres).',
      csms_ai_apply_log: 'Log penerapan rekomendasi AI ke nilai folder (bisa dibatalkan).',
      csms_ai_feedback: 'Umpan balik evaluator terhadap hasil AI.',
      csms_ai_file_summary: 'Cache ringkasan isi berkas hasil ekstraksi.',
      csms_evidence_chunk: 'Potongan teks bukti dari berkas (opsional embedding vector).',
      csms_knowledge_base: 'Knowledge base kriteria penilaian (teks + embedding vector).',
      csms_ai_rubric_version: 'Versi rubric (kriteria penilaian Excel); satu versi aktif per tipe. Dibuat csms-ai.',
      csms_ai_rubric_item: 'Elemen rubric per versi (kolom sama dengan Excel). Dibuat csms-ai.',
      csms_ai_trial_snapshot: 'Cadangan hasil AI sebelum uji coba rubric. Dibuat csms-ai.',
      csms_ai_trial_result: 'Hasil uji coba rubric dibanding nilai evaluator. Dibuat csms-ai.',
    },
  },
];

const client = new pg.Client({ connectionString: env.db.url });
await client.connect();

const cols = (
  await client.query(`
    SELECT c.table_name, c.column_name, c.ordinal_position,
           CASE WHEN c.data_type = 'USER-DEFINED' THEN c.udt_name
                WHEN c.data_type = 'ARRAY' THEN substr(c.udt_name, 2) || '[]'
                WHEN c.character_maximum_length IS NOT NULL THEN c.data_type || '(' || c.character_maximum_length || ')'
                WHEN c.data_type = 'numeric' AND c.numeric_precision IS NOT NULL THEN 'numeric(' || c.numeric_precision || ',' || c.numeric_scale || ')'
                ELSE c.data_type END AS type,
           c.is_nullable = 'YES' AS nullable, c.column_default
      FROM information_schema.columns c
     WHERE c.table_schema = 'public'
     ORDER BY c.table_name, c.ordinal_position`)
).rows;

const pks = (
  await client.query(`
    SELECT tc.table_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
     WHERE tc.table_schema = 'public' AND tc.constraint_type = 'PRIMARY KEY'`)
).rows;

const fks = (
  await client.query(`
    SELECT cl.relname AS table_name, att.attname AS column_name, ref.relname AS ref_table, ratt.attname AS ref_column,
           CASE con.confdeltype WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'r' THEN 'RESTRICT' WHEN 'd' THEN 'SET DEFAULT' ELSE 'NO ACTION' END AS on_delete
      FROM pg_constraint con
      JOIN pg_class cl ON cl.oid = con.conrelid
      JOIN pg_namespace ns ON ns.oid = cl.relnamespace
      JOIN pg_class ref ON ref.oid = con.confrelid
      JOIN LATERAL unnest(con.conkey, con.confkey) AS k(col, rcol) ON TRUE
      JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = k.col
      JOIN pg_attribute ratt ON ratt.attrelid = con.confrelid AND ratt.attnum = k.rcol
     WHERE con.contype = 'f' AND ns.nspname = 'public'
     ORDER BY 1, 2`)
).rows;

const idx = (
  await client.query(`SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY 1, 2`)
).rows;

const enums = (
  await client.query(`
    SELECT t.typname, string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS labels
      FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
      JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE n.nspname = 'public' GROUP BY 1 ORDER BY 1`)
).rows;
await client.end();

const allTables = [...new Set(cols.map((c) => c.table_name as string))];
const described = new Set(DOMAINS.flatMap((d) => Object.keys(d.tables)));
const missing = allTables.filter((t) => !described.has(t));
if (missing.length) {
  DOMAINS.push({ key: 'other', title: 'Lainnya', intro: 'Tabel tanpa deskripsi (tambahkan di scripts/gen-data-dictionary.ts).', tables: Object.fromEntries(missing.map((t) => [t, '-'])) });
}

const pkSet = new Set(pks.map((p) => `${p.table_name}.${p.column_name}`));
const fkMap = new Map(fks.map((f) => [`${f.table_name}.${f.column_name}`, f]));
const esc = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
const shortDefault = (d: string | null) => (d ? esc(d.replace(/::[a-z_ ]+(\[\])?/gi, '').slice(0, 40)) : '');

const outDir = path.resolve(process.cwd(), '../../../docs/handover/database');
fs.mkdirSync(outDir, { recursive: true });

// ---------- KAMUS-DATA.md ----------
let md = `# Kamus Data HSE Proview\n\nDihasilkan otomatis oleh \`npx tsx scripts/gen-data-dictionary.ts\` (backend) dari database yang skemanya disinkronkan oleh kode. Jumlah tabel: **${allTables.length}**. Jangan edit manual; ubah deskripsi di skrip lalu jalankan ulang.\n\nKeterangan kolom: **PK** primary key, **FK** foreign key (tabel.kolom, aturan ON DELETE), **Null** boleh kosong.\n\n## Tipe enum\n\n| Enum | Nilai |\n| --- | --- |\n`;
for (const e of enums) md += `| \`${e.typname}\` | ${esc(e.labels)} |\n`;
md += `\n## Daftar tabel\n\n| Domain | Tabel | Fungsi |\n| --- | --- | --- |\n`;
for (const d of DOMAINS) for (const [t, desc] of Object.entries(d.tables)) md += `| ${d.title} | [\`${t}\`](#${t.replace(/_/g, '_')}) | ${esc(desc)} |\n`;

for (const d of DOMAINS) {
  md += `\n## ${d.title}\n\n${d.intro}\n`;
  for (const [t, desc] of Object.entries(d.tables)) {
    md += `\n### ${t}\n\n${desc}\n\n| Kolom | Tipe | Null | Default | Kunci |\n| --- | --- | --- | --- | --- |\n`;
    for (const c of cols.filter((c) => c.table_name === t)) {
      const key = [pkSet.has(`${t}.${c.column_name}`) ? 'PK' : '', (() => {
        const f = fkMap.get(`${t}.${c.column_name}`);
        return f ? `FK → ${f.ref_table}.${f.ref_column} (${f.on_delete})` : '';
      })()].filter(Boolean).join(', ');
      md += `| \`${c.column_name}\` | ${esc(c.type)} | ${c.nullable ? 'ya' : 'tidak'} | ${shortDefault(c.column_default)} | ${key} |\n`;
    }
    const ti = idx.filter((i) => i.tablename === t && !i.indexname.endsWith('_pkey'));
    if (ti.length) {
      md += `\nIndeks:\n\n`;
      for (const i of ti) md += `- \`${i.indexname}\`: \`${esc(i.indexdef.replace(/^CREATE (UNIQUE )?INDEX \S+ ON public\.\S+ USING /, (m, u) => (u ? 'UNIQUE ' : '')))}\`\n`;
    }
  }
}
fs.writeFileSync(path.join(outDir, 'KAMUS-DATA.md'), md);

// ---------- ERD.md (Mermaid per domain) ----------
const mermaidType = (t: string) => t.replace(/[^A-Za-z0-9_]/g, '_');
let erd = `# ERD HSE Proview\n\nDiagram relasi per domain (Mermaid \`erDiagram\`), dihasilkan dari foreign key di database. Hanya kolom PK dan FK yang ditampilkan agar terbaca; daftar kolom lengkap ada di [KAMUS-DATA.md](KAMUS-DATA.md). Tabel dari domain lain yang dirujuk ikut tampil tanpa kolom.\n`;
for (const d of DOMAINS) {
  const tables = Object.keys(d.tables);
  const rel = fks.filter((f) => tables.includes(f.table_name));
  // Domain besar digambar kiri-ke-kanan agar memanjang ke bawah, bukan melebar (terbaca di A4 tegak).
  erd += `\n## ${d.title}\n\n\`\`\`mermaid\nerDiagram\n${tables.length > 8 ? '  direction LR\n' : ''}`;
  for (const t of tables) {
    const keyCols = cols.filter((c) => c.table_name === t && (pkSet.has(`${t}.${c.column_name}`) || fkMap.has(`${t}.${c.column_name}`)));
    erd += `  ${t} {\n`;
    for (const c of keyCols) erd += `    ${mermaidType(c.type)} ${c.column_name} ${pkSet.has(`${t}.${c.column_name}`) ? 'PK' : 'FK'}\n`;
    erd += `  }\n`;
  }
  const seen = new Set<string>();
  for (const f of rel) {
    const k = `${f.ref_table}-${f.table_name}-${f.column_name}`;
    if (seen.has(k)) continue;
    seen.add(k);
    const nullable = cols.find((c) => c.table_name === f.table_name && c.column_name === f.column_name)?.nullable;
    erd += `  ${f.ref_table} ||--o{ ${f.table_name} : "${f.column_name}${nullable ? ' (opsional)' : ''}"\n`;
  }
  erd += '```\n';
}
fs.writeFileSync(path.join(outDir, 'ERD.md'), erd);
console.log(`KAMUS-DATA.md dan ERD.md ditulis ke ${outDir} (${allTables.length} tabel${missing.length ? `, ${missing.length} tanpa deskripsi` : ''}).`);
