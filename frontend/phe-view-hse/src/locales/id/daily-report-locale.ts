export default {
  pageTitle: "Laporan Harian",
  pageDescription: "Kelola dan pantau laporan aktivitas harian dan pengajuan",
  reportManagement: "Manajemen Laporan",
  filterTags: {
    noTimeRange: "Tidak Ada Rentang Waktu",
    reports: "Laporan"
  },
  viewModes: {
    gridView: "Tampilan Grid",
    tableView: "Tampilan Tabel",
    switchToGridView: "Beralih ke tampilan grid",
    switchToTableView: "Beralih ke tampilan tabel"
  },
  actions: {
    addReport: "Tambah Laporan",
    filter: "Filter"
  },
  table: {
    tableCardTitle: "Tabel Laporan",
    tableCardDescription: "Tabel laporan harian",
    reportDate: "Tanggal Laporan",
    reportedBy: "Dilaporkan Oleh",
    instansi: "Instansi",
    type: "Tipe",
    subType: "Sub Tipe / Vessel",
    action: "Aksi"
  },
  card: {
    edit: "Edit",
    delete: "Hapus"
  },
  deleteConfirmation: {
    title: "Hapus Laporan",
    content: "Apakah Anda yakin ingin menghapus laporan tanggal ",
    confirm: "Hapus",
    cancel: "Batal"
  },
  containerFilter: {
    title: "Filter Laporan Harian",
    description: "Atur filter untuk laporan harian",
    selectByRange: "Pilih Berdasarkan Rentang",
    dateStart: "Tanggal Mulai",
    dateEnd: "Tanggal Akhir",
    formType: "Tipe Formulir",
    subType: "Sub Tipe",
    sort: "Urutkan",
    order: "Urutan",
    yes: "Ya",
    no: "Tidak",
    ascending: "Naik",
    descending: "Turun",
    reportDate: "Tanggal Laporan",
    formTypeLabel: "Tipe Formulir",
    instansi: "Instansi",
    createdAt: "Dibuat Pada",
    updatedAt: "Diperbarui Pada"
  },
  edit: {
    headerTitle: "Edit Laporan Harian",
    headerDescription: "Ubah dan perbarui informasi laporan aktivitas harian",
    reportEditing: "Pengeditan Laporan",
    reportInformation: "Informasi Laporan",
    currentReportDetails: "Detail dan metadata laporan saat ini",
    reportNotFound: "Laporan tidak ditemukan!",
    stepLabels: {
      identity: "Isi Identitas",
      parameter: "Isi Parameter"
    },
    navigation: {
      back: "Kembali",
      next: "Selanjutnya",
      finish: "Selesai"
    },
    stepIndicator: "Langkah {{current}} dari {{total}}",
    deleteData: {
      title: "Hapus data",
      content: "Apakah Anda yakin ingin menghapus data?",
      confirm: "Hapus",
      cancel: "Batal"
    },
    notifications: {
      successUpdatedReport: "Berhasil memperbarui laporan",
      successDeletedSection: "Berhasil menghapus bagian laporan",
      successUpdatedAsset: "Berhasil memperbarui file aset",
      successDeletedAsset: "Berhasil menghapus file aset",
      errorMinOneFile: "Silakan unggah minimal satu file"
    }
  },
  create: {
    headerTitle: "Buat Laporan Harian",
    headerDescription: "Buat laporan aktivitas harian baru",
    reportCreation: "Pembuatan Laporan",
    reportOptions: "Opsi Laporan",
    uploadExcelForm: "Upload Formulir Excel",
    processingExcelFile: "Memproses file Excel...",
    noFileSelected: "Tidak ada file yang dipilih",
    invalidExcelFile: "Silakan pilih file Excel yang valid (.xlsx, .xls)",
    noSheetsFound: "Tidak ada sheet yang ditemukan dalam file Excel",
    summarySheetNotFound: "Sheet ringkasan tidak ditemukan dalam file Excel",
    unsupportedTemplate: "Format template Excel tidak didukung",
    fileProcessingError: "Gagal memproses file. Pastikan itu adalah file Excel yang valid.",
    successCreateReport: "Sukses mengimport file laporan"
  },
  // Marine form translations
  marine: {
    syncData: "Sinkron Data",
    syncWeather: "Sinkron Cuaca",
    loadMailFile: "Muat Mail File",
    processing: "Memproses...",
    syncSmartCard: "Sinkron KARPIT",
    syncPersonnel: "Sinkron Personel",
    emlFileErrors: {
      invalidFile: "Silakan pilih file .eml yang valid",
      parseError: "Gagal mengurai file EML. Silakan periksa format file.",
      readError: "Gagal membaca file yang dipilih",
      processingError: "Terjadi kesalahan saat memproses file EML",
      invalidFormat: "Konten email tidak dalam format JSON yang diharapkan",
      weatherFetchError: "Gagal mengambil data cuaca"
    },
    success: {
      emlLoaded: "Berhasil memuat file EML/MSG : {{subject}}",
      weatherSynced: "Data cuaca berhasil disinkronkan"
    }
  },
  weatherCopiedToForm: "Data cuaca berhasil disalin ke kolom cuaca",
  copyToWeatherField: "Salin ke kolom cuaca"
}