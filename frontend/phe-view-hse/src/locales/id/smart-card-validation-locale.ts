const smartCardValidation = {
  title: "Pusat Validasi Unggahan",
  description: "Tinjau dan selesaikan kesalahan unggahan untuk Observasi Kartu Pintar",
  
  header: {
    refreshAllData: "Muat Ulang Data",
    backToUpload: "Kembali ke Unggah"
  },

  statistics: {
    errorGroups: "Grup Kesalahan",
    requireAttention: "Memerlukan perhatian",
    totalErrorRows: "Total Baris Kesalahan",
    individualErrors: "Kesalahan individu",
    activeEmployees: "Pekerja Aktif",
    inDatabase: "Dalam database",
    belumMengisi: "Belum Mengisi",
    needToFill: "Perlu diisi"
  },

  errorGroups: {
    title: "Grup Kesalahan",
    refreshErrors: "Muat Ulang",
    exportCSV: "Ekspor CSV",
    autoResolveAll: "Selesaikan Semua",
    showingGroups: "Menampilkan {{count}} grup kesalahan ({{totalRows}} total baris kesalahan)",
    page: "Halaman {{currentPage}} dari {{totalPages}} ({{start}}-{{end}} dari {{total}})",
    noErrorsFound: "🎉 Tidak ada kesalahan ditemukan!",
    noErrorsMessage: "Semua unggahan telah diproses berhasil atau tidak ada filter yang cocok.",
    loading: "Memuat kesalahan...",
    refreshing: "Menarik ulang data kesalahan dan statistik",
    
    selectAll: "Pilih Semua",
    deleteSelected: "Hapus {{count}} Item",
    deleteSelectedConfirm: "Hapus {{count}} grup kesalahan yang dipilih secara permanen? Tindakan ini tidak dapat dibatalkan.",
    deleteConfirmTitle: "Konfirmasi Penghapusan",
    deleteCancel: "Batal",
    deleteConfirmAction: "Hapus",
    deleteSuccess: "{{count}} grup kesalahan berhasil dihapus",
    deleteFailed: "Gagal menghapus grup kesalahan",
    
    employee: "Pekerja",
    company: "Perusahaan",
    errorCount: "Jumlah Kesalahan",
    errorType: "Jenis Kesalahan",
    details: "Detail",
    hideDetails: "Sembunyikan Detail",
    showDetails: "Tampilkan Detail",
    
    suggestions: {
      title: "Saran Pekerja",
      hideSuggestions: "Sembunyikan Saran",
      showSuggestions: "Tampilkan Saran",
      processInfo: "Klik untuk memproses semua {{count}} baris dengan pekerja yang dipilih. Duplikat akan dihapus secara otomatis.",
      similarity: "{{percent}}%"
    },
    
    actions: {
      autoResolve: "Selesaikan Otomatis ({{count}} baris)",
      searchEmployee: "Cari Pekerja",
      deleteGroup: "Hapus Grup"
    },
    
    bulkResolveConfirm: "Selesaikan otomatis SEMUA grup kesalahan? Ini mungkin memakan waktu.",
    processingGroups: "Memproses semua grup kesalahan...",
    allGroupsProcessed: "Semua grup kesalahan diproses!",
    
    deleteConfirm: "Hapus grup kesalahan ini secara permanen? Tindakan ini tidak dapat dibatalkan.",
    deleteNotImplemented: "Fungsi hapus perlu diimplementasikan",
    
    export: {
      noErrors: "Tidak ada kesalahan untuk diekspor",
      success: "Kesalahan diekspor ke CSV berhasil"
    }
  },

  filters: {
    title: "Kontrol Filter",
    clearFilters: "Hapus Filter",
    
    errorType: {
      label: "Filter berdasarkan Jenis Kesalahan:",
      placeholder: "Semua Jenis",
      all: "Semua Jenis",
      employeeNotFound: "Pekerja Tidak Ditemukan",
      validationError: "Kesalahan Validasi",
      insertError: "Kesalahan Penyisipan"
    },
    
    employeeName: {
      label: "Cari Nama Pekerja:",
      placeholder: "Ketik nama pekerja..."
    },
    
    companyName: {
      label: "Cari Perusahaan:",
      placeholder: "Ketik nama perusahaan..."
    }
  },

  relatedTools: {
    title: "Alat Terkait",
    uploadData: "Unggah Data",
    uploadDataDesc: "Unggah file observasi baru",
    viewObservations: "Lihat Observasi",
    viewObservationsDesc: "Jelajahi data observasi",
    employeeManagement: "Manajemen Pekerja",
    employeeManagementDesc: "Kelola data pekerja",
    employeeDashboard: "Dasbor Pekerja",
    employeeDashboardDesc: "Pantau kinerja pekerja"
  },

  pagination: {
    previous: "Sebelumnya",
    next: "Berikutnya",
    ellipsis: "..."
  },
  
  createEmployee: "Buat Pekerja Baru",
  createEmployeeTitle: "Buat Pekerja Baru",
  createEmployeeDescription: "Silakan isi formulir di bawah ini untuk membuat pekerja baru.",
  employeeName: "Nama Pekerja",
  employeeNameRequired: "Nama pekerja wajib diisi",
  category: "Kategori",
  categoryRequired: "Kategori wajib diisi",
  subContractorId: "ID Sub Kontraktor",
  subContractorIdRequired: "ID sub kontraktor wajib diisi",
  identityNumber: "Nomor Identitas",
  identityNumberRequired: "Nomor identitas wajib diisi",
  createSuccess: "Pekerja berhasil dibuat"
};

export default smartCardValidation;