const smartCard = {
  title: "Kartu Pintar",
  description: "Pantau pekerja yang belum mengisi observasi kartu pintar mereka",
  missingObservations: "Observasi yang Hilang",
  notFilledTitle: "Belum Mengisi Kartu Pintar",

  navigation: {
    uploadData: "Unggah Data",
    errorValidation: "Validasi Kesalahan",
    refreshData: "Muat Ulang",
    refreshing: "Muat Ulang...",

    info: {
      upload: "Unggah data observasi kartu pintar",
      errors: "Lihat dan selesaikan kesalahan unggahan",
      monitor: "Pantau kepatuhan pekerja"
    }
  },

  stats: {
    totalEmployees: "Total Pekerja",
    allEmployees: "Semua pekerja",
    activeEmployees: "Pekerja Aktif",
    currentlyActive: "Saat ini aktif",
    sudahMengisi: "Sudah Mengisi",
    haveFilledForms: "Telah mengisi formulir",
    belumMengisi: "Belum Mengisi",
    needToFill: "Perlu diisi"
  },

  filters: {
    title: "Filter & Pencarian",
    description: "Filter dan cari pekerja yang belum mengisi observasi kartu pintar mereka",
    dateRange: "Rentang Tanggal",
    allCategory: "-- Semua Kategori --",
    allProjects: "-- Semua Proyek --",
    allVessel: "-- Semua Kapal --",
    allCompany: "-- Semua Perusahaan --",
    allDate: "-- Semua Tanggal --",
    searchEmployee: "Cari Pekerja",
    searchPlaceholder: "Cari berdasarkan nama...",
    searchTooltip: "Cari berdasarkan nama, perusahaan dan posisi",
    company: "Perusahaan",
    allCompanies: "-- Semua Perusahaan --",
    positionLabel: "Posisi",
    positionPlaceholder: "Filter berdasarkan posisi...",
    categoryLabel: "Kategori",
    allCategories: "Semua Kategori",
    mitra: "Mitra",
    project: "Proyek",
    crewMarine: "Kru Marine",
    dateStart: "Tanggal Mulai",
    dateEnd: "Tanggal Akhir:",
    sortBy: "Urut Berdasarkan",
    employeeName: "Nama Pekerja",
    companyName: "Nama Perusahaan",
    position: "Posisi",
    category: "Kategori",
    order: "Urutan:",
    ascending: "Naik",
    descending: "Turun",
    perPage: "Per Halaman:",
    thisWeek: "Minggu Ini",
    thisMonth: "Bulan Ini",
    lastMonth: "Bulan Lalu",
    clearDates: "Hapus Tanggal",
    clearAllFilters: "Hapus Semua Filter",
    employeeStatusAll: "Semua Pekerja",
    employeeStatusRegistered: "Terdaftar",
    employeeStatusUnmatched: "Tidak Terdaftar (Employee Not Found)",
    note: "Catatan:",
    noteText: "Filter tanggal menunjukkan pekerja yang tidak memiliki observasi dalam rentang tanggal yang dipilih. Biarkan kosong untuk menampilkan semua pekerja yang belum pernah mengisi observasi."
  },

  table: {
    employeeName: "NAMA",
    company: "Perusahaan",
    position: "Posisi",
    category: "Kategori",
    status: "Status",
    onDuty: "Bertugas",
    off: "Libur",
    loading: "Memuat data pekerja...",
    noEmployeesFound: "🎉 Tidak ada pekerja yang ditemukan!",
    noEmployeesMessage: "Semua pekerja telah mengisi observasi mereka atau tidak ada hasil yang cocok dengan filter Anda.",
    na: "T/A",
    totalSubmission: "TOTAL SUBMISSION",
    target: "TARGET",
    rate: "RATE"
  }
};

export default smartCard;