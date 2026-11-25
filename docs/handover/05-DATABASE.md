# 05. Database

HSE Proview memakai satu database PostgreSQL berisi 62 tabel di schema `public`, dua tipe enum, dan empat ekstensi. Struktur lengkap ada di tiga berkas yang dihasilkan otomatis dari kode:

| Berkas | Isi |
| --- | --- |
| [database/ERD.md](database/ERD.md) | Diagram relasi (Mermaid) per domain |
| [database/KAMUS-DATA.md](database/KAMUS-DATA.md) | Tiap tabel: fungsi, kolom, tipe, null, default, PK/FK, indeks |
| [database/schema.sql](database/schema.sql) | DDL lengkap (`pg_dump --schema-only`) dari instalasi baru |

## Ringkasan domain

| Domain | Tabel | Tabel utama |
| --- | --- | --- |
| Autentikasi, pengguna, master data | 10 | `users`, `accounts`, `sessions`, `sub_contractors`, `vessels` |
| Proyek dan laporan harian | 17 | `subtypes`, `work_locations`, `daily_reports`, 13 tabel `report_*` |
| Karyawan, absensi, kartu pintar | 15 | `employees`, `attendance`, `employee_*`, `smart_card_observations` |
| Log manhours | 1 | `log_manhours` |
| CSMS | 9 | `csms_contract`, `csms_contract_folder` (hierarki `ltree`), `csms_approval_log` |
| CSMS AI | 10 | `csms_ai_evaluation_job`, `csms_knowledge_base` (`vector`), `csms_ai_rubric_*` |

Ekstensi: `ltree` (hierarki folder CSMS), `uuid-ossp` dan `pgcrypto` (UUID), `vector` (embedding knowledge base, disarankan). Enum: `UserRole` (admin, user, evaluator, verifikator, manager, contractor, crew, employee) dan `StatusContractEnum` (pending, accept, reject, revision).

Kolom penting yang perlu dipahami:

- `csms_contract_folder.path` (ltree): seluruh pohon folder kontrak. Query subtree memakai `path <@ 'root.path'`.
- `csms_contract_folder.ai_*`: hasil AI terakhir per folder; nilai resmi tetap di `score`/`status` yang diisi evaluator.
- `accounts.password`: hash scrypt Better Auth (`salt:key` heksadesimal). Jangan diisi teks biasa.
- `subtypes.extra` (JSON): pengaturan proyek, mis. `autoCalculateManhours`.

## Cara skema dikelola

Aplikasi **tidak** memakai migrasi bernomor. Setiap kali backend start, `src/db/ensure/index.ts` menjalankan DDL idempoten secara berurutan di bawah advisory lock (aman untuk beberapa instance pm2):

| Modul | Isi |
| --- | --- |
| `01-extensions-and-types.ts` | Ekstensi dan enum |
| `02-auth-core.ts` | Auth dan master data |
| `03-work-locations-report.ts` | Proyek, lokasi kerja, laporan harian |
| `04-employee-attendance.ts` | Karyawan, absensi, kartu pintar, unggahan |
| `05-log-manhours.ts` | Log manhours dan partial unique index |
| `06-csms.ts` | Modul CSMS dan CSMS AI |
| `07-column-repairs.ts` | Memperbaiki nama kolom pada DB yang dibuat versi lama |
| `08-updated-at-triggers.ts` | Trigger `updated_at` |

Tabel `csms_ai_rubric_*` dan `csms_ai_trial_*` dibuat oleh csms-ai (`python -m server.scripts.ensure_schema`, juga otomatis saat csms-ai start). Drizzle schema di `src/db/schema/*.ts` adalah definisi tipe untuk query, dan harus selalu sama dengan hasil `ensure`.

Aturannya (lengkap di `src/db/ensure/README.md`): hanya `CREATE ... IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`, tidak pernah `DROP` atau `TRUNCATE`. Perubahan yang merusak data (hapus kolom, ganti tipe) dikerjakan manual dengan skrip SQL terpisah setelah backup.

### Saat menambah atau mengubah tabel

1. Ubah Drizzle schema di `src/db/schema/`.
2. Tambahkan DDL idempoten yang setara di modul `ensure` yang sesuai.
3. Perbarui dokumen skema dari database kosong:

   ```bash
   createdb hse_schema_tmp
   cd backend/phe-view-hse/backend
   POSTGRES_DB=hse_schema_tmp npm run schema:dump -- --ensure-only
   (cd csms-ai && DATABASE_URL=postgresql://<user>:<pw>@localhost:5432/hse_schema_tmp python -m server.scripts.ensure_schema)
   POSTGRES_DB=hse_schema_tmp npm run schema:dump -- --dump-only
   POSTGRES_DB=hse_schema_tmp npx tsx scripts/gen-data-dictionary.ts     # KAMUS-DATA.md + ERD.md
   dropdb hse_schema_tmp
   ```

4. Commit perubahan kode bersama `schema.sql`, `KAMUS-DATA.md`, dan `ERD.md`. CI gagal bila `schema.sql` tidak sesuai kode. Pakai PostgreSQL 17 (versi yang sama dengan CI) agar isi dump identik.

## Backup

| Cara | Perintah |
| --- | --- |
| Server (DB + uploads sekaligus) | `bash docs/handover/scripts/backup-server.sh /srv/hse-proview/backend/.env /srv/hse-proview/backups` |
| Hanya DB, SQL biasa | `pg_dump -h <host> -U <user> -d pheview_hse --no-owner --no-privileges \| gzip > pheview_hse_$(date +%F).sql.gz` |
| Hanya DB, format custom (restore selektif) | `pg_dump -Fc -h <host> -U <user> -d pheview_hse > pheview_hse_$(date +%F).dump` |

Backup database tanpa folder uploads tidak lengkap: tabel hanya menyimpan path berkas. Simpan keduanya dari waktu yang sama.

## Restore

Restore selalu ke database **kosong** (dump sudah berisi skemanya sendiri), baru kemudian jalankan backend agar `ensure` menambahkan apa pun yang lebih baru.

```bash
createdb -O hse pheview_hse
psql -d pheview_hse -c 'CREATE EXTENSION IF NOT EXISTS ltree; CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; CREATE EXTENSION IF NOT EXISTS pgcrypto; CREATE EXTENSION IF NOT EXISTS vector;'
gunzip -c pheview_hse_2026-11-25.sql.gz | psql -U hse -d pheview_hse -v ON_ERROR_STOP=1
tar -xzf uploads_pheview_hse_2026-11-25.tar.gz -C /srv/hse-proview/     # menghasilkan /srv/hse-proview/uploads
# lalu start backend: preflight + ensure berjalan otomatis
```

Pesan `extension "..." already exists` saat restore dapat diabaikan. Untuk format `.dump`: `pg_restore --no-owner -d pheview_hse berkas.dump`.

## Data demo

`docs/demo_data/synthetic_pheview_hse_server.sql.gz` berisi data sintetis (bukan data asli) untuk demo dan pelatihan. Pemasangan otomatis di Windows: `docs/demo_data/setup_dummy_db.ps1` (membuat DB, berkas dummy, dan password acak per akun). Penjelasan: `docs/INSTALL_DUMMY_DATABASE.md`. Setelah memuat dump apa pun ke lingkungan demo, jalankan `node docs/safeview-demo/set_demo_passwords.mjs` agar tidak ada password bawaan yang tersisa.

## Perbedaan instalasi baru dengan database lama

Instalasi baru dari kode sedikit lebih ketat daripada database produksi yang tumbuh sejak 2025: beberapa foreign key ada di instalasi baru tetapi tidak di database lama (mis. `log_manhours` ke `subtypes`/`vessels`/`sub_contractors`), dan tabel detail laporan (`report_*`) memakai `ON DELETE CASCADE`. Database lama yang di-restore tidak diubah oleh `ensure` untuk hal ini (constraint hanya dibuat bersama tabel baru), jadi perilakunya tetap sama seperti sebelum serah terima.
