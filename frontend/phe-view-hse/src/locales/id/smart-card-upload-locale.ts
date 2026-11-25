const smartCardUpload = {
  title: "Unggah Kartu Pintar",
  description: "Unggah dan proses data kartu pintar dari file Excel",
  
  header: {
    title: "Unggah Observasi Kartu Pintar",
    description: "Unggah dan proses data observasi kartu pintar dari file Excel"
  },

  instructions: {
    title: "Instruksi Unggah",
    item1: "Unggah file Excel (.xlsx atau .xls) yang berisi data observasi kartu pintar",
    item2: "Beberapa file dapat diunggah secara bersamaan untuk pemrosesan batch",
    item3: "File harus mengandung sheet \"data-online\"",
    item4: "Hanya baris dengan \"Fungsi / Bagian\" = \"Production Operations\" yang akan diproses",
    item5: "Sistem akan secara otomatis mencocokkan nama pekerja dengan database"
  },

  uploadSection: {
    title: "Unggah File Excel",
    selectFiles: "Pilih File Excel (dukungan file ganda):",
    selectedFiles: "File Terpilih ({{count}})",
    clearAll: "Hapus Semua",
    fileName: "Nama File",
    fileSize: "Ukuran File",
    removeFile: "Hapus File",
    uploadButton: "Unggah dan Proses {{count}} File",
    uploadButtonProcessing: "Memproses {{count}} file...",
    uploadCompleted: "Unggahan Selesai!",
    totalFilesProcessed: "Total {{count}} file diproses",
    
    results: {
      success: "Sukses",
      failed: "Gagal",
      totalRows: "Total Baris",
      successRows: "Sukses",
      skippedRows: "Dilewati",
      errorRows: "Kesalahan",
      errorsDetected: "Kesalahan terdeteksi yang perlu ditinjau manual",
      reviewErrors: "Tinjau Kesalahan"
    }
  },

  history: {
    title: "Riwayat Unggahan",
    refresh: "Muat Ulang",
    loading: "Memuat riwayat unggahan...",
    selectAll: "Pilih Semua",
    deleteSelected: "Hapus {{count}} Item",
    deleteSelectedConfirm: "Hapus {{count}} riwayat unggahan yang dipilih secara permanen? Tindakan ini tidak dapat dibatalkan.",
    deleteConfirmTitle: "Konfirmasi Penghapusan",
    deleteCancel: "Batal",
    deleteConfirmAction: "Hapus",
    deleteSuccess: "{{count}} riwayat unggahan berhasil dihapus",
    deleteFailed: "Gagal menghapus riwayat unggahan",
    
    filters: {
      search: "Cari:",
      searchPlaceholder: "Cari nama file...",
      status: "Status:",
      statusAll: "Semua Status",
      statusSuccess: "Sukses",
      statusError: "Kesalahan",
      sortBy: "Urut Berdasarkan:",
      sortByUploadTime: "Waktu Unggah",
      sortByFilename: "Nama File",
      sortByStatus: "Status",
      sortByTotalRows: "Total Baris",
      dateStart: "Tanggal Mulai:",
      dateEnd: "Tanggal Akhir:",
      perPage: "Per halaman:"
    },
    
    empty: {
      title: "Tidak ada riwayat unggahan ditemukan",
      description: "Unggah beberapa file untuk melihat riwayat di sini atau sesuaikan filter"
    },
    
    pagination: {
      showing: "Menampilkan {{showing}} dari {{total}} entri",
      page: "Halaman {{currentPage}} dari {{totalPages}}",
      previous: "Sebelumnya",
      next: "Berikutnya"
    },
    
    items: {
      success: "Sukses",
      error: "Kesalahan",
      hasErrors: "Memiliki Kesalahan",
      id: "ID: {{id}}",
      dataRange: "Rentang Data:",
      recordSpan: "rentang rekaman",
      errorMessage: "Kesalahan:",
      viewErrors: "Lihat Kesalahan ({{count}})",
      viewErrorsSimple: "Lihat Kesalahan",
      recordsSaved: "Rekaman Disimpan",
      totalRows: "Total Baris",
      successRows: "Sukses",
      skippedRows: "Dilewati",
      errorRows: "Kesalahan"
    }
  },

  relatedTools: {
    title: "Alat Tambahan",
    description: "Alat pelengkap untuk manajemen observasi kartu pintar",
    
    employeeMonitoring: {
      title: "Pemantauan Pekerja",
      description: "Lacak pekerja yang belum mengisi observasi kartu pintar mereka dengan filter lanjutan dan opsi ekspor."
    }
  }
};

export default smartCardUpload;