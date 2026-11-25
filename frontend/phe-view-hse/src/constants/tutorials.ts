/**
 * In-app tutorials (driver.js) and the per-role PDF guides share this one source.
 * A step without a matching element on the page is shown as a centred popover, so a tour never breaks.
 * Roles: admin, user, contractor, evaluator, verifikator, manager, crew (employee has no web access).
 */

export type TutorialRole = 'admin' | 'user' | 'contractor' | 'evaluator' | 'verifikator' | 'manager' | 'crew';
export type TutorialStep = { element?: string; title: string; text: string };
export type Tutorial = {
  id: string;
  title: string;
  /** what the dashboard is for (PDF section intro) */
  purpose: string;
  roles: TutorialRole[];
  /** page the tour runs on; the app navigates there first */
  route?: string;
  /** the tour needs this page (e.g. a contract detail page that needs a contract id) */
  requiresPath?: string;
  requiresHint?: string;
  steps: TutorialStep[];
  tips?: string[];
};

export const TUTORIAL_VERSION = 'v1';

export const ROLE_LABEL: Record<TutorialRole, string> = {
  admin: 'Admin',
  user: 'User HSE',
  contractor: 'Kontraktor',
  evaluator: 'Evaluator',
  verifikator: 'Verifikator',
  manager: 'Manager',
  crew: 'Crew',
};

const ALL: TutorialRole[] = ['admin', 'user', 'contractor', 'evaluator', 'verifikator', 'manager', 'crew'];
const PHE: TutorialRole[] = ['admin', 'user'];
const APPROVERS: TutorialRole[] = ['evaluator', 'verifikator', 'manager'];

const SIDEBAR = '[data-sidebar="sidebar"]';
const CONTENT = '[data-slot="sidebar-inset"]';
const menu = (url: string) => `${SIDEBAR} a[href="${url}"]`;
const card = `${CONTENT} [data-slot="card"]`;
const table = `${CONTENT} [data-slot="table"]`;

const approval = (role: 'evaluator' | 'verifikator' | 'manager', order: string, next: string): Tutorial => ({
  id: `persetujuan-${role}`,
  title: `Persetujuan penilaian (${ROLE_LABEL[role]})`,
  purpose: `Sebagai ${ROLE_LABEL[role]}, Anda adalah persetujuan tahap ${order} untuk folder penilaian CSMS yang sudah final. ${next}`,
  roles: [role],
  route: '/csms/contracts/contract-list',
  steps: [
    { element: menu('/csms/contracts/contract-list'), title: 'Daftar kontrak', text: 'Menu ini berisi kontrak yang penilaiannya menunggu atau sudah melewati persetujuan.' },
    { element: table, title: 'Pilih kontrak', text: 'Klik kontrak untuk membuka detailnya. Kolom status menunjukkan tahap persetujuan saat ini.' },
    { title: 'Buka folder penilaian', text: 'Di halaman detail, pilih folder penilaian (mis. "10-10-2026 - PB"). Hanya folder yang sudah final yang bisa disetujui.' },
    { element: '[data-tour="approval-progress"]', title: 'Progres persetujuan', text: `Urutan persetujuan: Evaluator, Verifikator, lalu Manager. Tombol Setujui/Tolak hanya aktif saat giliran ${ROLE_LABEL[role]}.` },
    { title: 'Tinjau sebelum menyetujui', text: 'Periksa skor per elemen, catatan evaluator, dan dokumen. Hasil AI hanya rekomendasi; yang disetujui adalah skor evaluator.' },
    { title: 'Setujui atau tolak', text: 'Setujui bila penilaian sudah benar. Tolak dengan catatan yang jelas bila perlu revisi; penilaian kembali ke evaluator CSMS.' },
  ],
  tips: ['Catatan penolakan dibaca oleh tim penilai; tulis apa yang harus diperbaiki dan di elemen mana.', 'Notifikasi muncul di lonceng saat ada penilaian yang menunggu persetujuan Anda.'],
});

export const TUTORIALS: Tutorial[] = [
  {
    id: 'mulai',
    title: 'Mulai di sini',
    purpose: 'Mengenal tata letak SafeView: menu, header, notifikasi, tutorial, dan akun.',
    roles: ALL,
    steps: [
      { element: SIDEBAR, title: 'Menu utama', text: 'Semua halaman yang bisa Anda buka ada di sini, dikelompokkan per modul (Reporting, CSMS, Pekerja, Notifikasi). Isi menu menyesuaikan role Anda.' },
      { element: '[data-sidebar="trigger"]', title: 'Lipat menu', text: 'Klik untuk melipat atau membuka menu agar area kerja lebih luas.' },
      { element: '[data-tour="nav-tutorial"]', title: 'Tutorial', text: 'Daftar tutorial untuk setiap halaman. Bisa diputar ulang kapan saja, dan ada PDF panduan lengkap untuk role Anda.' },
      { element: '[data-tour="nav-notif"]', title: 'Notifikasi', text: 'Pemberitahuan terbaru (pekerja dan CSMS). Titik merah berarti ada yang belum dibaca.' },
      { element: '[data-tour="nav-profile"]', title: 'Akun', text: 'Profil, ganti kata sandi, dan keluar.' },
    ],
    tips: ['Tutorial tidak pernah berjalan sendiri. Tekan ESC atau klik di luar kotak untuk keluar kapan saja.'],
  },
  {
    id: 'hse-performance',
    title: 'HSE Performance',
    purpose: 'Ringkasan kinerja HSE: indikator utama dan tren per periode.',
    roles: ['admin', 'user', ...APPROVERS],
    route: '/hse-performance',
    steps: [
      { element: menu('/hse-performance'), title: 'HSE Performance', text: 'Halaman awal setelah login untuk tim PHE.' },
      { element: card, title: 'Indikator', text: 'Kartu ringkas menampilkan angka utama periode terpilih.' },
      { element: CONTENT, title: 'Grafik dan filter', text: 'Ubah periode atau kontraktor untuk melihat tren. Arahkan kursor ke grafik untuk detail angka.' },
    ],
  },
  {
    id: 'daily-report',
    title: 'Daily Report',
    purpose: 'Membuat dan memantau laporan harian kegiatan di kapal/lapangan.',
    roles: ['admin', 'user', 'contractor', 'crew'],
    route: '/daily-report/list',
    steps: [
      { element: menu('/daily-report/list'), title: 'Daily Report Form', text: 'Daftar laporan harian.' },
      { element: CONTENT, title: 'Filter dan buat laporan', text: 'Gunakan filter tanggal/kapal. Tombol tambah membuka formulir laporan baru.' },
      { element: table, title: 'Daftar laporan', text: 'Klik laporan untuk melihat atau mengubah. Status menunjukkan apakah laporan sudah lengkap.' },
    ],
    tips: ['Isi laporan di hari yang sama agar data kinerja dan jam kerja aman akurat.'],
  },
  {
    id: 'daily-activity',
    title: 'Daily Activity Report',
    purpose: 'Rekap kegiatan harian dari laporan yang sudah masuk.',
    roles: ['admin', 'user', 'contractor'],
    route: '/daily-activity/summary',
    steps: [
      { element: menu('/daily-activity/summary'), title: 'Daily Activity', text: 'Rekap aktivitas per hari dan per kapal.' },
      { element: CONTENT, title: 'Ringkasan', text: 'Pilih periode untuk melihat rekap, lalu buka detail bila perlu.' },
    ],
  },
  {
    id: 'csms-dashboard',
    title: 'CSMS Dashboard',
    purpose: 'Gambaran status CSMS kontraktor: skor penilaian, tahap, dan tren.',
    roles: ['admin', 'user', 'contractor', ...APPROVERS],
    route: '/csms/dashboard',
    steps: [
      { element: menu('/csms/dashboard'), title: 'CSMS Dashboard', text: 'Ringkasan semua penilaian CSMS.' },
      { element: CONTENT, title: 'Filter', text: 'Filter tahun dan kontraktor mengubah semua grafik di halaman ini.' },
      { element: card, title: 'Ringkasan skor', text: 'Kartu dan grafik menampilkan skor penilaian dan statusnya. Klik bagian grafik untuk detail.' },
    ],
    tips: ['Ekspor dashboard ke Excel tersedia untuk laporan berkala.'],
  },
  {
    id: 'csms-guidelines',
    title: 'Guidelines CSMS',
    purpose: 'Dokumen panduan CSMS yang menjadi acuan kontraktor dan penilai.',
    roles: ['admin', 'user', 'contractor'],
    route: '/csms/guidelines',
    steps: [
      { element: menu('/csms/guidelines'), title: 'Guidelines', text: 'Kumpulan dokumen panduan CSMS.' },
      { element: CONTENT, title: 'Unduh atau kelola', text: 'Kontraktor mengunduh panduan. Admin/User dapat menambah atau memperbarui dokumen.' },
    ],
  },
  {
    id: 'csms-sertifikat',
    title: 'Sertifikat',
    purpose: 'Data sertifikat (SIKA dan lainnya) beserta masa berlakunya.',
    roles: ['admin', 'user', 'contractor'],
    route: '/csms/qualification',
    steps: [
      { element: menu('/csms/qualification'), title: 'Sertifikat', text: 'Daftar sertifikat kontraktor.' },
      { element: CONTENT, title: 'Masa berlaku', text: 'Perhatikan status masa berlaku. Sertifikat yang hampir habis perlu diperbarui.' },
    ],
  },
  {
    id: 'contract-management',
    title: 'Contract Management',
    purpose: 'Daftar kontrak CSMS dan pintu masuk ke penilaian per kontrak.',
    roles: ['admin', 'user', 'contractor'],
    route: '/csms/contract-management',
    steps: [
      { element: menu('/csms/contract-management'), title: 'Contract Management', text: 'Semua kontrak CSMS yang terkait dengan akun Anda.' },
      { element: table, title: 'Daftar kontrak', text: 'Klik kontrak untuk membuka detail: folder penilaian (PSB, PB, PA), dokumen, dan skor.' },
      { element: CONTENT, title: 'Cari dan tambah', text: 'Gunakan pencarian. Admin/User dapat membuat kontrak baru.' },
    ],
  },
  {
    id: 'penilaian-kontrak',
    title: 'Penilaian kontrak (evaluator CSMS)',
    purpose: 'Menilai dokumen kontraktor per elemen K3LL: status, skor 0/3/6/10, dan catatan.',
    roles: PHE,
    requiresPath: '/csms/contract-details',
    requiresHint: 'Buka salah satu kontrak di Contract Management, lalu jalankan tutorial ini lagi.',
    steps: [
      { element: '[data-tour="root-folders"]', title: 'Folder penilaian', text: 'Pilih folder penilaian (PSB, PB, PA). Folder yang sudah final terkunci.' },
      { element: '[data-tour="stats-folder"]', title: 'Ringkasan folder', text: 'Skor total, tanggal penilaian, auditor, progres persetujuan, dan tombol ekspor.' },
      { element: '[data-tour="folder-tree"]', title: 'Elemen dan dokumen', text: 'Struktur elemen 1 sampai 8.2 beserta dokumennya. Kolom Skor menampilkan skor evaluator; label ungu "AI" adalah rekomendasi AI.' },
      { element: '[data-tour="folder-tree"] svg.lucide-ellipsis', title: 'Menu elemen', text: 'Menu titik tiga: Penilaian (status, skor, catatan), catatan untuk kontraktor, dan aksi AI.' },
      { title: 'Mengisi penilaian', text: 'Pilih status (Accept, Revisi, Reject, N/A) dan skor 0/3/6/10, tulis catatan. Skor induk dihitung otomatis.' },
      { title: 'Finalisasi', text: 'Setelah semua elemen dinilai, tandai folder final untuk masuk ke alur persetujuan Evaluator, Verifikator, Manager.' },
      { element: '[data-tour="folder-tree"]', title: 'Unggah dengan drag & drop', text: 'Seret berkas dari komputer langsung ke baris folder elemen. Folder tujuan menyala biru; folder induk (A. RENCANA K3LL, kategori 3 sampai 8) menyala merah dan menolak berkas. Konfirmasi menampilkan path lengkap sebelum berkas diunggah.' },
    ],
    tips: ['Badge "Selisih" berarti skor AI dan evaluator berbeda 2 tingkat atau lebih: tinjau ulang elemen itu.'],
  },
  {
    id: 'kelola-periode-admin',
    title: 'Salin PB dan buka finalisasi (admin)',
    purpose: 'Menyalin berkas dan skor penilaian ke periode lain, dan membuka kembali penilaian yang sudah final.',
    roles: ['admin'],
    requiresPath: '/csms/contract-details',
    requiresHint: 'Buka salah satu kontrak di Contract Management, lalu jalankan tutorial ini lagi.',
    steps: [
      { element: '[data-tour="root-folders"] svg.lucide-copy', title: 'Salin ke periode lain', text: 'Ikon salin pada periode yang sudah lengkap: salin ke periode sebelum/sesudahnya, atau "Salin ke periode lain…" untuk memilih periode mana saja.' },
      { title: 'Pilih isi salinan', text: 'Di dialog salin, aktifkan "Salin juga skor penilaian" lalu pilih kategori (default semua). Berkas di periode tujuan diganti; dialog menunjukkan jumlahnya dan memberi peringatan bila tujuan sudah final.' },
      { element: '[data-testid="definalize-button"]', title: 'Buka finalisasi', text: 'Pada folder yang sudah final, tombol "Buka Finalisasi" membuka kembali folder agar kontraktor bisa mengunggah lagi. Alasan wajib diisi dan kontraktor mendapat notifikasi.' },
      { element: '[data-tour="approval-progress"]', title: 'Persetujuan berlanjut', text: 'Riwayat persetujuan mencatat "Dibuka ulang oleh admin". Setelah difinalisasi ulang, persetujuan lanjut dari level terakhir, tidak mulai dari awal.' },
    ],
    tips: ['Badge "Dibuka ulang" di daftar periode berarti folder sedang dibuka admin dan belum difinalisasi lagi.', 'Badge "Berisi salinan" berarti periode itu memuat berkas hasil salinan.'],
  },
  {
    id: 'kontraktor-unggah',
    title: 'Mengunggah dokumen CSMS',
    purpose: 'Mengunggah bukti per elemen K3LL dan menindaklanjuti catatan perbaikan.',
    roles: ['contractor'],
    requiresPath: '/csms/contract-details',
    requiresHint: 'Buka kontrak Anda di Contract Management, lalu jalankan tutorial ini lagi.',
    steps: [
      { element: '[data-tour="root-folders"]', title: 'Folder penilaian', text: 'Pilih folder penilaian yang sedang dibuka (PSB, PB, atau PA).' },
      { element: '[data-tour="folder-tree"]', title: 'Elemen K3LL', text: 'Setiap folder adalah satu elemen (1 sampai 8.2). Unggah dokumen bukti ke folder elemen yang sesuai.' },
      { element: '[data-tour="folder-tree"] svg.lucide-ellipsis', title: 'Unggah dan catatan', text: 'Menu titik tiga: unggah berkas, buat subfolder, dan isi catatan untuk penilai.' },
      { element: '[data-tour="folder-tree"]', title: 'Drag & drop', text: 'Atau seret berkas dari komputer langsung ke folder elemen. Folder tujuan menyala biru; folder induk menyala merah dan menolak berkas. Periksa path di dialog konfirmasi sebelum mengunggah.' },
      { title: 'Status penilaian', text: 'Accept = diterima; Revisi = ada kekurangan, baca catatan dan unggah perbaikan; Reject = dokumen tidak memenuhi.' },
      { title: 'Format berkas', text: 'PDF yang teksnya bisa disalin paling mudah dinilai. Pindaian dan foto tetap dibaca, ZIP/7Z/RAR juga diterima.' },
    ],
    tips: ['Beri nama berkas sesuai isinya, mis. "Laporan MWT Mei 2026.pdf".', 'Unduh "Catatan Perbaikan" dari halaman detail untuk melihat semua kekurangan sekaligus.'],
  },
  {
    id: 'evaluasi-ai',
    title: 'Evaluasi AI',
    purpose: 'Menjalankan penilaian AI untuk seluruh folder, satu kategori, atau satu elemen, lalu membaca hasilnya.',
    roles: ['admin'],
    requiresPath: '/csms/contract-details',
    requiresHint: 'Buka salah satu kontrak, pilih folder penilaian yang lengkap, lalu jalankan tutorial ini lagi.',
    steps: [
      { element: '[data-tour="ai-evaluate"]', title: 'Tombol evaluasi AI', text: 'Menilai seluruh elemen folder ini. Sebelum mulai, Anda memilih mode.' },
      { title: 'Mode Cepat vs Menyeluruh', text: 'Cepat: bagian penting dokumen, 1 juri, maksimal 10 menit per elemen; untuk pra-penilaian. Menyeluruh: seluruh isi berkas, 3 juri, acuan ±30 menit per elemen; untuk skor akhir.' },
      { element: '[data-tour="folder-tree"] svg.lucide-ellipsis', title: 'Evaluasi per elemen/kategori', text: 'Menu titik tiga pada elemen atau kategori: "Evaluasi AI elemen ini" untuk menilai sebagian saja.' },
      { element: '[data-tour="folder-tree"] svg.lucide-file-text', title: 'Catatan AI', text: 'Ikon catatan membuka hasil AI: kesimpulan, checklist rubrik, penilaian tiap juri, rekomendasi, dan dokumen yang perlu dilengkapi.' },
      { title: 'Berkas berubah', text: 'Badge biru "Berkas berubah" berarti ada berkas baru setelah penilaian AI. Jalankan ulang elemen itu.' },
      { title: 'Koreksi untuk AI', text: 'Saat skor Anda berbeda dari AI, isi "Koreksi untuk AI" di dialog Penilaian. AI memakainya sebagai contoh di penilaian berikutnya.' },
    ],
    tips: ['Elemen dengan keyakinan di bawah 0,85 ditandai "tinjau".', 'Hasil AI adalah rekomendasi; skor akhir tetap ditetapkan evaluator.'],
  },
  {
    id: 'hasil-ai',
    title: 'Hasil CSMS AI dan menerapkan rekomendasi',
    purpose: 'Membandingkan skor manual dan AI per kategori, lalu menerapkan rekomendasi AI dengan aman.',
    roles: PHE,
    requiresPath: '/csms/contract-details',
    requiresHint: 'Buka kontrak yang sudah dinilai AI, lalu jalankan tutorial ini lagi.',
    steps: [
      { element: '[data-testid="ai-result-button"]', title: 'Result CSMS AI', text: 'Membuka dashboard mini: skor total manual vs AI, kesesuaian, grafik per kategori, dan tabel per elemen.' },
      { title: 'Membaca dashboard', text: 'Selisih dihitung dalam tingkat skor (0, 3, 6, 10). "Hanya yang berbeda" menyaring elemen yang perlu ditinjau. Ekspor Excel berisi ringkasan per kategori dan detail per elemen.' },
      { element: '[data-testid="ai-apply-all-stats"]', title: 'Terapkan rekomendasi AI', text: 'Membuka pratinjau. Bawaan hanya elemen yang belum dinilai, hasil AI valid, dan keyakinan ≥ 0,85. Status mengikuti skor: 10/6 Accept, 3 Revisi, 0 Reject.' },
      { title: 'Per kategori', text: 'Di dashboard atau menu kategori: "Pakai rekomendasi AI" untuk satu kategori saja.' },
      { title: 'Batalkan', text: 'Tombol "Batalkan penerapan terakhir" mengembalikan skor dan catatan sebelumnya. Folder final tidak bisa diubah. Skor selalu bisa diubah manual.' },
    ],
  },
  approval('evaluator', 'pertama', 'Setelah Anda menyetujui, penilaian diteruskan ke Verifikator.'),
  approval('verifikator', 'kedua', 'Setelah Anda menyetujui, penilaian diteruskan ke Manager.'),
  approval('manager', 'terakhir', 'Persetujuan Anda menyelesaikan penilaian.'),
  {
    id: 'pekerja-dashboard',
    title: 'Dashboard Pekerja',
    purpose: 'Ringkasan data pekerja: jumlah, kompetensi, dan kehadiran.',
    roles: ['admin', 'user', 'contractor'],
    route: '/employee/dashboard',
    steps: [
      { element: menu('/employee/dashboard'), title: 'Dashboard Pekerja', text: 'Gambaran jumlah dan status pekerja.' },
      { element: CONTENT, title: 'Grafik', text: 'Klik grafik untuk melihat daftar pekerja terkait.' },
    ],
  },
  {
    id: 'data-pekerja',
    title: 'Data Pekerja',
    purpose: 'Daftar pekerja beserta detail, sertifikat, dan status.',
    roles: ['admin', 'user', 'contractor', 'crew'],
    route: '/employee/list',
    steps: [
      { element: menu('/employee/list'), title: 'Data Pekerja', text: 'Daftar pekerja yang terkait dengan akun Anda.' },
      { element: CONTENT, title: 'Cari dan detail', text: 'Cari nama atau nomor HSSE Passport, lalu buka detail pekerja.' },
    ],
  },
  {
    id: 'kartu-pintar',
    title: 'Kartu Pintar',
    purpose: 'Kartu identitas pintar pekerja: unggah, validasi, dan cetak.',
    roles: ['admin', 'user', 'contractor'],
    route: '/employee/smart-card',
    steps: [
      { element: menu('/employee/smart-card'), title: 'Kartu Pintar', text: 'Kelola kartu pintar pekerja.' },
      { element: CONTENT, title: 'Unggah dan validasi', text: 'Unggah data kartu, periksa hasil validasi, lalu perbaiki data yang tidak cocok.' },
    ],
  },
  {
    id: 'absensi',
    title: 'Absensi Pekerja',
    purpose: 'Rekap kehadiran pekerja per hari dan per lokasi.',
    roles: PHE,
    route: '/employee/attendance-list',
    steps: [
      { element: menu('/employee/attendance-list'), title: 'Absensi Pekerja', text: 'Rekap kehadiran.' },
      { element: CONTENT, title: 'Filter dan detail', text: 'Pilih tanggal/lokasi, lalu buka detail untuk melihat riwayat kehadiran.' },
    ],
  },
  {
    id: 'notifikasi',
    title: 'Notifikasi',
    purpose: 'Semua pemberitahuan sistem dalam satu tabel.',
    roles: ALL,
    route: '/notification/list',
    steps: [
      { element: '[data-tour="nav-notif"]', title: 'Lonceng', text: 'Notifikasi terbaru tanpa meninggalkan halaman.' },
      { element: CONTENT, title: 'Tabel notifikasi', text: 'Riwayat lengkap. Klik untuk membuka halaman terkait dan menandai sudah dibaca.' },
    ],
  },
  {
    id: 'data-management',
    title: 'Data Management',
    purpose: 'Data master: nama proyek, kontraktor, dan kapal kontraktor.',
    roles: PHE,
    route: '/contractors',
    steps: [
      { element: menu('/sub-types'), title: 'Project Name', text: 'Daftar nama proyek.' },
      { element: menu('/contractors'), title: 'Contractors', text: 'Data perusahaan kontraktor.' },
      { element: menu('/contractor-vessels'), title: 'Contractor Vessel', text: 'Kapal milik kontraktor.' },
      { element: table, title: 'Kelola data', text: 'Tambah, ubah, atau hapus data master. Perubahan dipakai di seluruh modul.' },
    ],
  },
  {
    id: 'users',
    title: 'Users',
    purpose: 'Mengelola akun pengguna dan role.',
    roles: ['admin'],
    route: '/admin/users',
    steps: [
      { element: menu('/admin/users'), title: 'Users', text: 'Semua akun pengguna.' },
      { element: CONTENT, title: 'Tambah dan ubah', text: 'Buat akun, atur role (Admin, User, Kontraktor, Crew, Evaluator, Verifikator, Manager), dan reset kata sandi.' },
    ],
  },
  {
    id: 'ai-csms',
    title: 'AI CSMS: kualitas dan rubrik',
    purpose: 'Memantau kualitas penilaian AI dan mengisi rubrik (knowledge base) yang dipakai juri AI.',
    roles: ['admin'],
    route: '/admin/csms-ai',
    steps: [
      { element: menu('/admin/csms-ai'), title: 'AI CSMS', text: 'Pusat pengaturan AI CSMS.' },
      { element: '[data-tour="ai-how"]', title: 'Cara kerja', text: 'Alur dari berkas sampai skor. Kualitas skor paling ditentukan oleh AI CHECKS dan aturan skor di rubrik.' },
      { element: '[data-tour="ai-tabs"]', title: 'Tiga tab', text: 'Kualitas AI (kesesuaian AI vs evaluator), Rubrik AI (isi knowledge base), Panduan kalibrasi (langkah menyelaraskan AI).' },
      { element: '[data-tour="ai-quality-kpi"]', title: 'Kualitas AI', text: 'Target: sama persis ≥ 70% dan selisih ≤ 1 tingkat ≥ 95%. "Perbaiki rubrik" membuka elemen terkait.' },
      { title: 'Rubrik AI', text: 'Pilih elemen, isi kolom per bagian (ikon i berisi penjelasan dan contoh). Pemeriksa kualitas di kanan menilai kelengkapan 0 sampai 10. Simpan selalu membuat versi baru.' },
      { title: 'Impor/Ekspor Excel', text: 'Ekspor, ubah di Excel dengan format yang sama, lalu impor. Riwayat versi memungkinkan kembali ke versi lama.' },
    ],
  },
  {
    id: 'kalibrasi-ai',
    title: 'Panduan kalibrasi AI',
    purpose: 'Menyelaraskan skor AI dengan praktik evaluator lewat kelas Check (Wajib/Utama/Pendukung) dan koreksi.',
    roles: ['admin'],
    route: '/admin/csms-ai',
    steps: [
      { element: '[data-tour="ai-tabs"]', title: 'Tab Panduan kalibrasi', text: 'Buka tab ketiga untuk langkah lengkap.' },
      { title: '1. Selisih terbesar', text: 'Di Kualitas AI, pilih 5 sampai 10 elemen dengan rata-rata selisih terbesar.' },
      { title: '2. Kelas Check', text: 'Tentukan tiap Check: Wajib (tanpa ini skor maks. 3), Utama (menentukan 6), Pendukung (hanya membedakan 6 dan 10).' },
      { title: '3. Draf rubrik', text: 'Tinjau versi "kalibrasi (draf)" yang disiapkan sistem: lihat, ubah, lalu aktifkan.' },
      { title: '4. Koreksi', text: 'Hapus koreksi sintetis yang tidak tepat; tulis koreksi singkat dan spesifik.' },
      { title: '5. Uji', text: 'Jalankan mode Menyeluruh di 2 sampai 3 folder final. Pakai versi baru bila hasilnya lebih baik.' },
    ],
  },
];

export const tutorialsFor = (role?: string | null) => TUTORIALS.filter((t) => t.roles.includes((role ?? '') as TutorialRole));

export const isTutorialEnabled = () => (import.meta.env.VITE_FEATURE_TUTORIAL ?? 'true') !== 'false';

export const pdfUrlFor = (role?: string | null) =>
  role && role in ROLE_LABEL ? `/tutorials/panduan-safeview-${role}.pdf` : null;
