# Frontend — HSE Proview / SafeView

SPA React (TypeScript) dengan Vite, TanStack Router/Query/Table, Tailwind, shadcn/ui (Radix), dan ECharts. Dipaket dengan **bun**. Satu kode, tiga hasil build: **PO-View** (prod/dev) dan **SafeView** (demo; logo, judul, dan favicon berbeda).

Langkah demo lengkap (server `phe`): [`docs/safeview-demo/DEPLOY_DEMO.md`](../../docs/safeview-demo/DEPLOY_DEMO.md). Backend: [README backend](../../backend/phe-view-hse/backend/README.md).

## 1. Prasyarat

- [bun](https://bun.sh) (install dan build) dan Node.js ≥ 22 (typecheck, Cypress).
- Backend berjalan dan bisa dijangkau dari browser (alamatnya diisi di `VITE_APP_BASE_URL`).

## 2. Konfigurasi (env, dibaca saat **build**)

Vite menanam nilai `VITE_*` ke hasil build, jadi **ubah env lalu build ulang** (mengubah file di server tidak berpengaruh).

| Variabel | Keterangan |
|---|---|
| `VITE_APP_BASE_URL` | URL backend, tanpa slash akhir (mis. `http://127.0.0.1:3000`) |
| `VITE_APP_VARIANT` | `demo` mengaktifkan tampilan SafeView. Diisi oleh `.env.demo` |
| `VITE_FEATURE_TUTORIAL` | `false` menyembunyikan tombol tutorial (bawaan aktif) |

File: `.env` (lokal, di-ignore), `.env.demo` (tanpa rahasia, ikut repo), `.env.demo.local.example` (salin ke `.env.demo.local` untuk menjalankan demo lokal). Jangan menaruh rahasia di variabel `VITE_*`: semuanya terlihat di browser.

## 3. Skrip

| Perintah | Fungsi |
|---|---|
| `bun install` | Pasang dependensi |
| `bun run dev` | Dev server (PO-View) |
| `bun run dev:demo` | Dev server tampilan SafeView (butuh `.env.demo.local`) |
| `bun run build` | Build produksi PO-View + typecheck |
| `bun run build:demo` | Build SafeView (`--mode demo`) + typecheck |
| `bun run serve` | Pratinjau hasil build |
| `npx tsc --noEmit -p tsconfig.json` | Typecheck saja |
| `bun run cy:open` / `bun run cy:ai` | Cypress (lihat [cypress/README.md](cypress/README.md)) |

## 4. Menjalankan lokal

```bash
cd frontend/phe-view-hse
bun install
echo "VITE_APP_BASE_URL=http://127.0.0.1:3000" > .env     # sesuaikan dengan backend lokal
bun run dev                                               # http://localhost:5173
```

Backend harus mengizinkan origin ini lewat `FRONTEND_URL` (CORS dan cookie). Salah satu dari keduanya salah gejalanya login lalu langsung logout.

## 5. Build dan deploy

```bash
bun install
bun run build            # PO-View (prod/dev)   -> ./dist
bun run build:demo       # SafeView (demo)      -> ./dist
```

Build memakai `VITE_APP_BASE_URL` yang aktif saat itu. Pastikan menunjuk backend environment tujuan sebelum membangun.

Perintah kirim yang sudah dipakai:

```bash
# PO-VIEW — https://<DOMAIN_APP>
scp -P <SSH_PORT> -r ./dist/* <SSH_USER>@<IP_SERVER>:/srv/hse-proview/frontend && ssh -p <SSH_PORT> <SSH_USER>@<IP_SERVER> "chmod -R 775 /srv/hse-proview/frontend/*"

# Development — http://<IP_SERVER>:5153
scp -P <SSH_PORT> -r ./dist/* <SSH_USER>@<IP_SERVER>:/srv/hse-proview-dev/frontend && ssh -p <SSH_PORT> <SSH_USER>@<IP_SERVER> "chmod -R 775 /srv/hse-proview-dev/frontend/*"

# Demo SafeView — http://<IP_SERVER>:5180
scp -P <SSH_PORT> -r ./dist/* <SSH_USER>@<IP_SERVER>:/srv/hse-proview-demo/frontend/ && ssh -p <SSH_PORT> <SSH_USER>@<IP_SERVER> "chmod -R 775 /srv/hse-proview-demo/frontend/*"
```

Sebelum `scp`, simpan `dist` sebelumnya di server (`frontend_<tanggal>.tgz`) agar bisa rollback.

### nginx (static + SPA)

```nginx
server {
    listen <PORT>;
    server_name <HOST>;
    root /srv/<folder>/frontend;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }        # tanpa ini, refresh halaman = 404
    location /assets/ { expires 30d; add_header Cache-Control "public, immutable"; }
    location /uploads/ { proxy_pass http://127.0.0.1:<PORT_BACKEND>/uploads/; }   # lihat catatan di bawah
}
```

Lalu `sudo nginx -t && sudo systemctl reload nginx`.

**Catatan `/uploads/`:** di mode produksi backend membentuk URL berkas sebagai `<FRONTEND_URL>/uploads/...` (di mode development memakai alamat backend langsung). Artinya request berkas datang ke **alamat frontend**, jadi server frontend harus meneruskan `/uploads/` ke backend (backend menyajikan folder `UPLOADS_DIR` di `/uploads/`) atau memetakannya ke folder yang sama dengan `alias`. Tanpa ini gambar dan dokumen akan mengembalikan `index.html` atau 404. Cek konfigurasi nginx yang sedang berjalan sebelum menganggap bagian ini sudah ada.

### Cek setelah deploy

1. Buka URL frontend: judul tab dan logo sesuai varian (PO-View atau SafeView).
2. DevTools → Network: semua request API ke backend yang benar.
3. Login, buka halaman CSMS, buka dokumen. Bila gambar/dokumen 404 atau yang terbuka malah halaman aplikasi: `location /uploads/` di nginx belum meneruskan ke backend, atau `UPLOADS_DIR` backend salah.

## 6. Tutorial in-app dan PDF panduan

Tutorial (ikon topi wisuda di sebelah lonceng) berisi 24 tutorial untuk 7 role. Datanya satu sumber: `src/constants/tutorials.ts`. PDF panduan per role ada di `public/tutorials/panduan-safeview-<role>.pdf` dan ikut ter-build.

Bila UI atau isi tutorial berubah, buat ulang PDF (stack uji harus berjalan, lihat cypress/README.md):

```bash
# 1. tangkapan layar (DB demo yang dianonimkan)
E2E_CAPTURE=1 npx cypress run --e2e --config trashAssetsBeforeRuns=false --spec cypress/e2e/tutorial/capture.cy.ts
# 2. PDF
cd ../../backend/phe-view-hse/backend && npx tsx scripts/build-tutorial-pdf.ts
```

## 7. Memperbarui dependensi

```bash
npx npm-check-updates -u
npm install
```

Setelah itu jalankan `bun run build` (termasuk typecheck) dan uji halaman utama sebelum deploy.

## 8. Troubleshooting

| Gejala | Penyebab umum |
|---|---|
| Halaman putih / API 404 | `VITE_APP_BASE_URL` salah saat build, bukan di server. Build ulang |
| Login lalu logout, atau error CORS | `FRONTEND_URL` / `BETTER_AUTH_URL` di backend tidak sama persis dengan URL yang dibuka |
| Refresh halaman 404 | nginx tanpa `try_files ... /index.html` |
| Tampilan lama setelah deploy | Cache browser: hard refresh. `index.html` tidak boleh di-cache lama; hanya `/assets/` |
| Tombol tutorial tidak ada | `VITE_FEATURE_TUTORIAL=false` saat build |
| `bun run build` gagal di tahap `tsc` | Ada error tipe; jalankan `npx tsc --noEmit -p tsconfig.json` untuk daftar lengkapnya |
