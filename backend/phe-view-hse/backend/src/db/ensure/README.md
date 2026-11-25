# Panduan Developer: Idempotent Database Auto-Ensure System

Direktori ini berisi seluruh modul **Auto-Ensure Database Schema** yang dijalankan secara otomatis setiap kali server backend start (`src/server.ts`).

Tujuan sistem ini:
1. **Idempoten & Non-Destruktif**: Tidak akan pernah menghapus (`DROP`) tabel atau data yang ada. Aman dijalankan ratusan kali.
2. **Otomatisasi Multi-Environment**: Memastikan database lokal, staging, maupun server produksi selalu memiliki tabel, kolom, relasi, dan index terbaru tanpa perlu migrasi manual yang rentan terlupa.

---

## Struktur Modul

| Berkas | Domain / Cakupan |
| :--- | :--- |
| `01-extensions-and-types.ts` | Ekstensi PostgreSQL (`uuid-ossp`, `ltree`, `vector`) dan tipe ENUM (`UserRole`, `StatusContractEnum`). |
| `02-auth-core.ts` | Autentikasi & master core (`users`, `accounts`, `sessions`, `sub_contractors`, `vessels`, `locations`, dll.). |
| `03-work-locations-report.ts` | Proyek (`subtypes`), `work_locations`, `daily_reports`, dan 14 tabel detail laporan. |
| `04-employee-attendance.ts` | Master karyawan (`employees`), absensi (`attendance`), status siklus (`employee_status`), kartu pintar, file & log upload. |
| `05-log-manhours.ts` | Metrik `log_manhours`, kolom `work_location_id`, dan 3 partial unique index esensial. |
| `06-csms.ts` | Modul CSMS (guideline, contract, folder hierarki ltree, approval, AI evaluation, dll.). |
| `index.ts` | Orchestrator utama yang dipanggil di `src/server.ts`. |

---

## Panduan untuk Developer Saat Ada Perubahan Skema

### 1. Menambahkan Kolom Baru pada Tabel yang Sudah Ada
Jika Anda menambahkan field baru pada Drizzle schema (misal menambahkan kolom `phone_number` pada tabel `employees`):

1. Buka modul terkait (misal `04-employee-attendance.ts`).
2. Tambahkan baris SQL idempoten:
   ```sql
   ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);
   ```

### 2. Menambahkan Tabel Baru
Jika Anda menambahkan tabel baru ke sistem:

1. Tentukan modul domain yang sesuai (atau buat modul baru `07-feature-name.ts` jika domain baru).
2. Tambahkan DDL dengan `CREATE TABLE IF NOT EXISTS`:
   ```sql
   CREATE TABLE IF NOT EXISTS my_new_table (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
     title VARCHAR(255) NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   );
   ```
3. Jika membuat modul baru, daftarkan pemanggilannya di `index.ts`.

### 3. Menambahkan Index atau Constraint Baru
Gunakan sintaks `IF NOT EXISTS` atau blok `DO $$ BEGIN ... END $$;`:
```sql
CREATE INDEX IF NOT EXISTS idx_my_table_created_at ON my_new_table(created_at);
```

---

> [!CAUTION]
> **Aturan Utama**:
> **JANGAN PERNAH** menuliskan perintah `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, atau `DELETE` di dalam modul-modul ini. Semua perintah harus bersifat aditif (*additive*) dan idempoten.
