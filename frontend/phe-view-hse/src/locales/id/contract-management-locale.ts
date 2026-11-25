export default {
  pageTitle: "Manajemen Kontrak",
  pageSubtitle: "Kelola kontrak dan struktur foldernya",
  addContract: "Tambah Kontrak",
  updateContract: "Perbarui Kontrak",
  deleteContract: "Hapus Kontrak",
  contractTitle: "Judul Kontrak",
  contractNumber: "No. Kontrak",
  contractor: "Kontraktor",
  vesselName: "Kapal",
  contractDate: "Tanggal Kontrak",
  contractProgress: "Progres Kontrak",
  startDate: "Tanggal Mulai",
  endDate: "Tanggal Selesai",
  notes: "Catatan",
  searchPlaceholder: "Cari...",
  searchTooltip: "Cari berdasarkan nama Kontrak atau nama Sub Kontraktor",
  allContractors: "Semua Kontraktor",
  sortBy: "Urutkan berdasarkan",
  tableView: "Tampilan Tabel",
  cardView: "Tampilan Kartu",
  loading: "Memuat kontrak...",
  errorLoading: "Kesalahan Memuat Kontrak",
  confirmDeletion: "Konfirmasi Penghapusan",
  deleteConfirmation: "Apakah Anda yakin ingin menghapus penilaian berjalan \"{TITLE}\"?",
  deleteWarning: "Tindakan ini tidak dapat dibatalkan.",
  deletingContract: "Menghapus kontrak...",
  delete: "Hapus",
  cancel: "Batal",
  refreshSuccess: "Kontrak berhasil disegarkan",
  createSuccess: "Kontrak berhasil dibuat",
  updateSuccess: "Kontrak berhasil diperbarui",
  deleteSuccess: "Kontrak berhasil dihapus",
  createError: "Gagal membuat kontrak",
  updateError: "Gagal memperbarui kontrak",
  deleteError: "Gagal menghapus kontrak",
  startDateError: "Tanggal mulai harus sebelum tanggal selesai",
  manageOngoingDates: "Kelola Tanggal Berjalan",
  viewDetails: "Lihat Rincian",
  ongoingAssessmentDate: "Tanggal Penilaian Berjalan",
  add: "Tambah",
  updateAssessmentDate: "Perbarui Tanggal Penilaian Berjalan",
  actions: "Aksi",
  edit: "Perbarui",
  contractAssessment: "Penilaian Kontrak",
  fileName: "Nama File",
  lastModified: "Terakhir Diubah",
  // Table headers and messages
  name: "Nama",
  updatedAt: "Diperbarui Pada",
  status: "Status",
  score: "Skor",
  note: "Catatan",
  folderOnly: "Folder saja",
  selectFolderMessage: "Silakan pilih folder untuk melihat isinya",
  noFoldersMessage: "Tidak ada folder yang ditemukan untuk kontrak ini",
  editDescription: "Edit Deskripsi",
  createNote: "Buat Catatan",
  // Error handling
  error: {
    title: "Kesalahan Memuat Data",
    loadingFailed: "Gagal memuat data folder kontrak",
    retry: "Coba lagi",
    goBack: "Kembali ke Manajemen Kontrak",
    missingContractId: "ID Kontrak diperlukan untuk melihat detail kontrak"
  },
  // Folder actions
  uploadFile: "Unggah File",
  editFolder: "Edit Folder",
  deleteFolder: "Hapus Folder",
  editFile: "Edit File",
  deleteFile: "Hapus File",
  createdAt: "Dibuat Pada",
  changeRating: "Penilaian",
  accept: "Accept",
  reject: "Reject",
  revisi: "Revisi",
  rejectText: "Ditolak",
  user: "User",

  // Change rating modal translations
  changeRatingModal: {
    title: "Perbarui Penilaian",
    description: "Perbarui penilaian untuk folder: {folderName}",
    status: {
      label: "Status",
      placeholder: "Pilih status",
      required: "Silakan pilih status"
    },
    score: {
      label: "Skor",
      placeholder: "Masukkan skor",
      required: "Silakan masukkan skor"
    },
    note: {
      label: "Catatan",
      placeholder: "Masukkan catatan"
    },
    sendNotification: {
      label: "Kirim Notifikasi"
    }
  },

  // Change note modal translations
  changeNoteModal: {
    title: "Perbarui Catatan",
    description: "Perbarui catatan untuk folder: {folderName}",
    noteContractor: {
      label: "Catatan Kontraktor",
      placeholder: "Masukkan catatan kontraktor"
    }
  },

  // Subfolder creation translations
  createSubfolder: {
    title: "Buat Folder Baru",
    description: "Buat folder baru di bawah: {parentFolderName}",
    folderName: {
      label: "Nama Folder",
      placeholder: "Masukkan nama folder",
      required: "Silakan masukkan nama folder"
    }
  },
  // Delete file translations
  deleteFileModal: {
    title: "Konfirmasi Penghapusan File",
    description: "Apakah Anda yakin ingin menghapus file: {fileName}",
    confirmButton: "Hapus File",
    cancelButton: "Batal"
  },
  // Delete folder translations
  deleteFolderModal: {
    title: "Konfirmasi Penghapusan Folder",
    description: "Apakah Anda yakin ingin menghapus folder: {folderName}",
    confirmButton: "Hapus Folder",
    cancelButton: "Batal"
  },
  // Edit description translations
  editDescriptionModal: {
    title: "Edit Deskripsi Folder",
    description: "Perbarui deskripsi untuk folder: {folderName}",
    folderDescription: {
      label: "Deskripsi Folder",
      placeholder: "Masukkan deskripsi folder"
    }
  },
  // Edit file translations
  editFileModal: {
    title: "Edit Nama File",
    description: "Perbarui nama untuk file: {fileName}",
    fileName: {
      label: "Nama File",
      placeholder: "Masukkan nama file",
      required: "Silakan masukkan nama file"
    }
  },
  // Edit folder translations
  editFolderModal: {
    title: "Edit Nama dan Deskripsi Folder",
    description: "Perbarui nama dan deskripsi untuk folder: {folderName}",
    folderName: {
      label: "Nama Folder",
      placeholder: "Masukkan nama folder",
      required: "Silakan masukkan nama folder"
    },
    folderDescription: {
      label: "Deskripsi Folder",
      placeholder: "Masukkan deskripsi folder"
    }
  },
  // Upload file translations
  uploadFileModal: {
    title: "Unggah File ke Folder",
    description: "Unggah file ke folder: {folderName}",
    fileUpload: {
      label: "File untuk Diunggah",
      placeholder: "Pilih file untuk diunggah",
      required: "Silakan pilih setidaknya satu file untuk diunggah",
      maxFiles: "Maksimal 25 file yang dapat diunggah sekaligus",
      maxBatchSize: "Total ukuran file dalam satu batch upload tidak boleh melebihi 100 MB"
    }
  },
  // Root folder selector translations
  rootFolderSelector: {
    percentageLabelInfo: "Persentase folder yang telah disetujui penuh.",
    finalize: "Finalisasi",
    folderNavigation: "Navigasi Folder",
    assessmentFolder: "Folder penilaian",
    regularFolder: "Folder reguler",
    status: "Status",
    completed: "Selesai",
    inProgress: "Dalam Progres",
    expandAll: "Buka Semua",
    collapseAll: "Tutup Semua",
    selectFolderInfo: "Pilih folder untuk melihat isinya",
    copyConfirmationTitle: "Konfirmasi Salin Data",
    copyConfirmationDescription: "Apakah Anda yakin ingin menyalin data dari '{{source}}' ke '{{target}}'?",
    copySuccess: "Data berhasil disalin",
    copyError: "Gagal menyalin data",
    copyInProgress: "Proses penyalinan data sedang berlangsung...",
    totalScore: "Total Skor",
    note: "Catatan",
    viewMore: "Lihat Selengkapnya",
    passed: "Lulus",
    failed: "Tidak Lulus",
    complete: "Complete",
    exportPdf: "Ekspor ke PDF",
    exportZip: "Ekspor ke ZIP",
    exporting: "Exporting...",
    exportEvaluation: "Ekspor Penilaian",
    exportCatatanPerbaikan: "Ekspor Catatan Perbaikan",
    exportEchsms: "Ekspor E-CHSMS",
    completeConfirmationTitle: "Konfirmasi Tandai Selesai",
    completeConfirmationDescription: "Apakah Anda yakin ingin menandai folder '{{folder}}' sebagai selesai?",
    finalizeConfirmationTitle: "Konfirmasi Finalisasi",
    finalizeConfirmationDescription: "Apakah Anda yakin ingin finalisasi folder '{{folder}}'?",
    auditors: "Auditor",
    noAuditorsAssigned: "Tidak ada auditor yang ditugaskan",
    addAuditor: "Tambah Auditor",
    searchEvaluator: "Cari evaluator...",
    searchAuditor: "Cari auditor...",
    searchVerificator: "Cari verifikator...",
    searchManager: "Cari manager...",
    loadingUsers: "Memuat pengguna...",
    noUserFound: "Pengguna tidak ditemukan",
    deleteAuditorConfirmationTitle: "Konfirmasi Hapus Auditor",
    deleteAuditorConfirmationDescription: "Apakah Anda yakin ingin menghapus auditor {{auditorName}} dari folder ini?",
    approvalProgress: "Progres Persetujuan",
    approvalHistory: "Riwayat Persetujuan",
    approvalHistoryDesc: "Detail riwayat persetujuan untuk tahap ini",
    approved: "Disetujui",
    viewDetails: "Lihat Detail",
    approvalStatus: {
      fullyApproved: "Disetujui Penuh",
      inProgress: "Dalam Progres"
    },
    approvalSteps: {
      evaluator: "Evaluator",
      evaluatorDesc: "Evaluasi Awal",
      verificator: "Verifikator",
      verificatorDesc: "Verifikasi Data",
      manager: "Manager",
      managerDesc: "Persetujuan Akhir"
    },
    // Email sending translations
    sendEmail: "Kirim Email",
    emailHistory: "Riwayat Email",
    sentAt: "Dikirim pada",
    totalSent: "Total Terkirim",
    emailFailed: "Gagal",
    recipients: "Penerima",
    noEmailHistory: "Tidak ada riwayat pengiriman email",
    date: "Tanggal",
    noApprovalHistory: "Tidak ada riwayat persetujuan",
    resendEmail: "Kirim Ulang Email",
    sendingEmail: "Mengirim email...",
    sending: "Mengirim",
    resendEmailDescription: "Silakan pilih penerima untuk mengirim ulang email evaluasi.",
    emailSentSuccess: "Email berhasil dikirim!",
    emailSendFailed: "Gagal mengirim email. Silakan coba lagi.",
    docEvaluation: {
      title: "Statistik Dokumen Evaluasi",
      totalFolders: "Total Penilaian",
      approvedFolders: "Disetujui Penuh",
      exportedFiles: "File Diekspor",
      completionRate: "Tingkat Penyelesaian",
      description: "Ringkasan progres penilaian dan aktivitas ekspor dokumen."
    },
    assessmentDate: "Tanggal Penilaian"
  },
  metrics: {
    ongoingAssessments: "Penilaian Berjalan",
    finalAssessments: "Penilaian Selesai",
    completionRate: "Persentase Rate",
    totalAssessments: "Total Kontrak"
  },
  filters: {
    filter: "Filter",
    sortOrder: "Urut Data",
    ascending: "Naik",
    descending: "Turun",
  },
  form: {
    title: {
      label: "Judul Kontrak",
      placeholder: "Masukkan judul kontrak",
      required: "Silakan masukkan judul kontrak"
    },
    number: {
      label: "Nomor Kontrak",
      placeholder: "Masukkan nomor kontrak",
      required: "Silakan masukkan nomor kontrak"
    },
    contractor: {
      label: "Kontraktor",
      placeholder: "Pilih kontraktor",
      required: "Silakan pilih kontraktor"
    },
    startDate: {
      label: "Tanggal Mulai",
      placeholder: "Masukkan tanggal mulai",
      required: "Silakan masukkan tanggal mulai"
    },
    endDate: {
      label: "Tanggal Selesai",
      placeholder: "Masukkan tanggal selesai",
      required: "Silakan masukkan tanggal selesai"
    },
    notes: {
      label: "Catatan",
      placeholder: "Masukkan catatan tambahan"
    },
    add: {
      title: "Tambah Kontrak Baru",
      description: "Silakan isi formulir di bawah ini untuk membuat kontrak baru."
    },
    update: {
      title: "Perbarui Kontrak",
      description: "Silakan isi formulir di bawah ini untuk memperbarui kontrak."
    }
  }
};