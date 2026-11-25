const employee = {
  dashboard: {
    title: "Dasbor Pekerja",
    description: "Pantau kinerja pekerja dan metrik kepatuhan",
    performanceAnalytics: "Analitik Kinerja",
    employee: "Pekerja",
    onDuty: "On Duty",
    stats: {
      totalEmployees: "Total Pekerja",
      activeWorkforceCount: "Jumlah tenaga kerja aktif",
      employeesOnDuty: "Pekerja On Duty",
      currentlyActiveWorkers: "Pekerja yang sedang bertugas",
      documentCompliance: "Kepatuhan Dokumen",
      overallCompletionRate: "Tingkat penyelesaian keseluruhan",
      healthRiskRate: "Tingkat Risiko Kesehatan",
      aboveP3Threshold: "Di atas ambang batas P3"
    },
    charts: {
      complianceRatePerDocument: "Tingkat Kepatuhan Submit Dokumen",
      documentCompletionPerformance: "Kinerja penyelesaian dokumen berdasarkan jenis",
      healthRiskRatePerCategory: "Tingkat Risiko Kesehatan per Kategori",
      riskAssessmentDistribution: "Distribusi penilaian risiko berdasarkan kategori",
      complianceRateRankByCompany: "Peringkat Tingkat Kepatuhan Submit berdasarkan Perusahaan",
      topCompaniesByCompliance: "10 perusahaan teratas berdasarkan kinerja kepatuhan",
      healthRateRankByCompany: "Peringkat Tingkat Kesehatan berdasarkan Perusahaan",
      topCompaniesByHealth: "10 perusahaan teratas berdasarkan kinerja kesehatan",
      crewOnDutyByProject: "Kru yang Bertugas berdasarkan Proyek",
      totalCrewOnDutyByProject: "Total kru yang sedang bertugas dikelompokkan berdasarkan proyek",
      crewOnDutyByVessel: "Kru yang Bertugas berdasarkan Kapal",
      totalCrewOnDutyByVessel: "Total kru yang sedang bertugas dikelompokkan berdasarkan kapal"
    },
    count: "Data Terisi",
    total: "Total Data",
    submittedCount: "Yang sudah submit",
    submitHealth: "Tingkat kesehatan",
    filters: {
      employeeFilter: "Filter Pekerja",
      setEmployeeDashboardFilter: "Atur filter untuk dasbor pekerja",
      sortOrder: "Urutan pengurutan",
      ascending: "Urut Naik",
      descending: "Urut Turun",
      years: "Tahun",
      category: "Kategori",
      subContractor: "Sub Kontraktor",
      rankHealthOhih: "Peringkat Kesehatan OH IH",
      rankHealthType: "Jenis Peringkat Kesehatan",
      rankComplianceDoc: "Dokumen Peringkat Kepatuhan"
    }
  },
  employeeEdit: {
    tabGeneral: "Umum",
    tabStatus: "Status",
    tabValidation: "Validasi",
  },
  updateEmployee: {
    tabGeneral: "Umum",
    tabCategory: "Kategori",
    tabStatus: "Status",
    tabValidation: "Validasi",
  },
  detail: {
    vesselName: "Nama Kapal",
    noProject: "Tidak ada project",
    contract: "Kontrak",
    title: "Detail Pekerja",
    employeeDetails: "Detail Pekerja",
    viewingProfileFor: "Melihat profil untuk",
    employeeInfoAndDocs: "Informasi dan dokumentasi pekerja",
    profileDetails: "Detail Profil",
    onDuty: "On Duty",
    offDuty: "Off Duty",
    errorLoadingEmployeeDetails: "Kesalahan Memuat Detail Pekerja",
    deleteSection: "Hapus Bagian",
    areYouSureDeleteData: "Apakah Anda yakin ingin menghapus data?",
    delete: "Hapus",
    cancel: "Batal",
    successUpdatedData: "Berhasil memperbarui data",
    successDeletedSection: "Berhasil menghapus bagian",
    successDeletedAssetFiles: "Berhasil menghapus file aset",
    employeeProfile: "Profil Pekerja",
    updateEmployeeInfo: "Perbarui Informasi Pekerja",
    fillFormToUpdateEmployee: "Silakan isi formulir di bawah ini untuk memperbarui informasi pekerja.",
    cancelEdit: "Batal Edit",
    save: "Simpan",
    position: "Posisi",
    idKtp: "ID KTP",
    dateOfBirth: "Tanggal Lahir",
    location: "Lokasi",
    bargeLocation: "Lokasi Barge",
    idHsse: "HSSE e-Passport",
    verifiedBy: "Diverifikasi oleh",
    validationStatus: "Status Validasi",
    verifiedDate: "Tanggal Verifikasi",
    subContractor: "Sub Kontraktor",
    remarks: "Catatan",
    noBpjsRecords: "Tidak ada catatan BPJS",
    addBpjsInfo: "Tambahkan informasi BPJS untuk memulai",
    noContractRecords: "Tidak ada catatan kontrak",
    addContractInfo: "Tambahkan informasi kontrak untuk memulai",
    noVaccineRecords: "Tidak ada catatan vaksinasi",
    addVaccineInfo: "Tambahkan informasi vaksinasi untuk memulai",
    noSikaRecords: "Tidak ada catatan SIKA",
    addSikaInfo: "Tambahkan informasi SIKA untuk memulai",
    noMcuRecords: "Tidak ada catatan MCU",
    addMcuInfo: "Tambahkan informasi MCU untuk memulai",
    noBssRecords: "Tidak ada catatan BSS",
    addBssInfo: "Tambahkan informasi BSS untuk memulai",
    noBstRecords: "Tidak ada catatan BST",
    addBstInfo: "Tambahkan informasi BST untuk memulai",
    noCertificateRecords: "Tidak ada catatan sertifikat kompetensi",
    addCertificateInfo: "Tambahkan informasi sertifikat kompetensi untuk memulai",
    supportingFiles: "File Pendukung",
    records: "catatan",
    addBpjs: "Tambah BPJS",
    bssCertificate: "Sertifikat BSS",
    bstCertificate: "Sertifikat BST",
    competencyCertificate: "Sertifikat Kompetensi",
    expired: "Kedaluwarsa",
    active: "Aktif",
    add: "Tambah",
    // Added translations for form fields
    category: "Kategori",
    employeeName: "Nama Pekerja",
    projectName: "Nama Proyek",
    vessel: "Kapal",
    linkDataEmployee: "Tautan Data Pekerja",
    statusOnDuty: "Status Tugas",
    ppe: "Alat Pelindung Diri",
    updatePPE: "Perbarui Alat Pelindung Diri",
    ppePlaceholder: "Tuliskan Alat Pelindung Diri",
    otherHealthAssurance: "Jaminan Kesehatan Lainnya",
    updateOtherHealthAssurance: "Perbarui Jaminan Kesehatan Lainnya",
    otherHealthAssurancePlaceholder: "Tuliskan Jaminan Kesehatan Lainnya"
  },
  bpjs: {
    title: "BPJS",
    records: "catatan",
    add: "Tambah BPJS",
    noRecords: "Tidak ada catatan BPJS",
    addInfo: "Tambahkan informasi BPJS untuk memulai",
    uploadFiles: "Upload",
    supportingFiles: "File",
    form: {
      type: {
        label: "Tipe",
        placeholder: "Tipe",
        required: "Tipe BPJS harus diisi"
      },
      number: {
        label: "Nomor",
        placeholder: "Nomor",
        required: "Nomor BPJS harus diisi"
      },
      evidence: {
        label: "File Pendukung",
        required: "File pendukung BPJS harus diisi"
      },
      create: {
        title: "Tambah BPJS Baru",
        description: "Silakan isi formulir di bawah ini untuk membuat BPJS baru."
      },
      update: {
        title: "Perbarui BPJS",
        description: "Silakan isi formulir di bawah ini untuk memperbarui BPJS."
      }
    }
  },
  contract: {
    title: "Kontrak",
    records: "catatan",
    add: "Tambah Kontrak",
    noRecords: "Tidak ada catatan kontrak",
    addInfo: "Tambahkan informasi kontrak untuk memulai",
    uploadFiles: "Upload",
    supportingFiles: "File",
    form: {
      contractCode: {
        label: "Kode Kontrak",
        placeholder: "",
        required: "Kode kontrak harus diisi"
      },
      expiredDate: {
        label: "Tanggal Kedaluwarsa",
        shortLabel: "Kedaluwarsa",
        placeholder: "",
        required: ""
      },
      evidence: {
        label: "File Pendukung",
        required: "File pendukung kontrak harus diisi"
      },
      create: {
        title: "Tambah Kontrak Baru",
        description: "Silakan isi formulir di bawah ini untuk membuat kontrak baru."
      },
      update: {
        title: "Perbarui Kontrak",
        description: "Silakan isi formulir di bawah ini untuk memperbarui kontrak."
      },
      expiredDateCompany: {
        label: "Tanggal Kedaluwarsa Perusahaan",
        shortLabel: "Kedaluwarsa",
        placeholder: "",
        required: ""
      }
    }
  },
  vaccination: {
    title: "Vaksinasi",
    records: "catatan",
    add: "Tambah Vaksinasi",
    noRecords: "Tidak ada catatan vaksinasi",
    addInfo: "Tambahkan informasi vaksinasi untuk memulai",
    uploadFiles: "Upload",
    supportingFiles: "File",
    form: {
      vaccineStatus: {
        label: "Status Vaksinasi",
        placeholder: "",
        required: "Status vaksinasi harus diisi"
      },
      vaccineDate: {
        label: "Tanggal Vaksinasi",
        shortLabel: "Vaksinasi",
        placeholder: "",
        required: "Tanggal vaksinasi harus diisi"
      },
      evidence: {
        label: "File Pendukung",
        required: "File pendukung vaksinasi harus diisi"
      },
      create: {
        title: "Tambah Vaksinasi Baru",
        description: "Silakan isi formulir di bawah ini untuk membuat vaksinasi baru."
      },
      update: {
        title: "Perbarui Vaksinasi",
        description: "Silakan isi formulir di bawah ini untuk memperbarui vaksinasi."
      }
    }
  },
  sika: {
    title: "SIKA",
    records: "catatan",
    add: "Tambah SIKA",
    noRecords: "Tidak ada catatan SIKA",
    addInfo: "Tambahkan informasi SIKA untuk memulai",
    uploadFiles: "Upload",
    supportingFiles: "File",
    form: {
      status: {
        label: "Status SIKA",
        placeholder: "",
        required: "Status SIKA harus diisi"
      },
      expiredDate: {
        label: "Tanggal Kedaluwarsa",
        shortLabel: "Kedaluwarsa",
        placeholder: "",
        required: "Tanggal kedaluwarsa harus diisi"
      },
      evidence: {
        label: "File Pendukung",
        required: "File pendukung SIKA harus diisi"
      },
      type: {
        label: "Tipe SIKA",
        placeholder: "",
        required: "Tipe SIKA harus diisi"
      },
      create: {
        title: "Tambah SIKA Baru",
        description: "Silakan isi formulir di bawah ini untuk membuat SIKA baru."
      },
      update: {
        title: "Perbarui SIKA",
        description: "Silakan isi formulir di bawah ini untuk memperbarui SIKA."
      }
    }
  },
  mcu: {
    title: "MCU",
    records: "catatan",
    add: "Tambah MCU",
    noRecords: "Tidak ada catatan MCU",
    addInfo: "Tambahkan informasi MCU untuk memulai",
    uploadFiles: "Upload",
    supportingFiles: "File",
    status: "Status",
    form: {
      statusKelaikanBekerja: {
        label: "Status Kelaikan Bekerja",
        placeholder: "",
        required: "Status kelaikan bekerja harus diisi"
      },
      skjScore: {
        label: "SKJ Score",
        placeholder: "",
        required: "SKJ score harus diisi",
        description: "Rendah (-7 s.d 1), Sedang (2 s.d 4), Tinggi (>=5)"
      },
      mcuHospitalName: {
        label: "Nama Rumah Sakit",
        placeholder: "",
        required: "Nama rumah sakit harus diisi"
      },
      mcuDeviationNotes: {
        label: "Catatan",
        placeholder: "",
        required: "Catatan harus diisi"
      },
      mcuFollowUp: {
        label: "Tindak Lanjut",
        placeholder: "",
        required: "Tindak lanjut harus diisi"
      },
      ohihReview: {
        label: "Derajat Kesehatan Pekerja",
        placeholder: "",
        required: "Derajat Kesehatan Pekerja harus diisi"
      },
      mcuDate: {
        label: "Tanggal MCU",
        placeholder: "",
        required: "Tanggal MCU harus diisi"
      },
      mcuExpiredDate: {
        label: "Tanggal Kedaluwarsa",
        shortLabel: "Kedaluwarsa",
        placeholder: "",
        required: "Tanggal kedaluwarsa harus diisi"
      },
      evidence: {
        label: "File Pendukung",
        required: "File pendukung MCU harus diisi"
      },
      create: {
        title: "Tambah MCU Baru",
        description: "Silakan isi formulir di bawah ini untuk membuat MCU baru."
      },
      update: {
        title: "Perbarui MCU",
        description: "Silakan isi formulir di bawah ini untuk memperbarui MCU."
      }
    }
  },
  certificate: {
    title: "Sertifikat",
    records: "catatan",
    add: "Tambah",
    noRecords: "Tidak ada catatan sertifikat",
    addInfo: "Tambahkan informasi sertifikat untuk memulai",
    uploadFiles: "Upload",
    supportingFiles: "File",
    form: {
      name: {
        label: "Nama",
        placeholder: "",
        required: "Nama harus diisi"
      },
      expiredDate: {
        label: "Tanggal Kedaluwarsa",
        shortLabel: "Kedaluwarsa",
        placeholder: "",
        required: "Tanggal kedaluwarsa harus diisi"
      },
      evidence: {
        label: "File Pendukung",
        required: "File pendukung sertifikat harus diisi"
      },
      create: {
        title: "Tambah Sertifikat Baru",
        description: "Silakan isi formulir di bawah ini untuk membuat sertifikat baru."
      },
      update: {
        title: "Perbarui Sertifikat",
        description: "Silakan isi formulir di bawah ini untuk memperbarui sertifikat."
      },
      isPermanent: {
        label: "Sertifikat lifetime",
        placeholder: "",
        required: "Sertifikat lifetime harus diisi"
      }
    }
  },
  smartCard: {
    validation: {
      createEmployee: "Buat Pekerja Baru",
      createEmployeeTitle: "Buat Pekerja Baru",
      createEmployeeDescription: "Silakan isi formulir di bawah ini untuk membuat pekerja baru.",
      employeeName: "Nama Pekerja",
      employeeNameRequired: "Nama pekerja wajib diisi",
      category: "Kategori",
      categoryRequired: "Kategori wajib diisi",
      subContractorId: "Sub Kontraktor",
      selectSubContractor: "Pilih Sub Kontraktor",
      subContractorIdRequired: "Sub kontraktor wajib diisi",
      identityNumber: "Nomor Identitas",
      identityNumberRequired: "Nomor identitas wajib diisi",
      createSuccess: "Pekerja berhasil dibuat"
    }
  },
  form: {
    statusChangeDate: {
      placeholder: "Pilih tanggal perubahan status"
    },
    category: {
      label: "Kategori",
      placeholder: "Pilih kategori",
      required: "Kategori wajib diisi"
    },
    subContractorId: {
      label: "Sub Kontraktor",
      placeholder: "Pilih sub kontraktor",
      required: "Sub kontraktor wajib diisi"
    },
    employeeName: {
      label: "Nama Pekerja",
      placeholder: "Masukkan nama pekerja",
      required: "Nama pekerja wajib diisi"
    },
    position: {
      label: "Posisi",
      placeholder: "Masukkan posisi",
      required: "Posisi wajib diisi"
    },
    identityNumber: {
      label: "Nomor Identitas",
      placeholder: "Masukkan nomor identitas",
      required: "Nomor identitas wajib diisi"
    },
    hssePassportNumber: {
      label: "Nomor Passport HSSE",
      placeholder: "Masukkan nomor passport HSSE",
      required: "Nomor passport HSSE wajib diisi"
    },
    statusOnDuty: {
      label: "Status Tugas",
      placeholder: "Pilih status tugas",
      required: "Status tugas wajib diisi",
      options: {
        onDuty: "On Duty",
        offDuty: "Off Duty"
      }
    },
    remarks: {
      label: "Catatan",
      placeholder: "Masukkan catatan",
      required: "Catatan wajib diisi"
    },
    verifiedBy: {
      label: "Diverifikasi Oleh",
      placeholder: "Masukkan nama verifikator",
      required: "Nama verifikator wajib diisi"
    },
    verifiedDate: {
      label: "Tanggal Verifikasi",
      placeholder: "Pilih tanggal verifikasi",
      required: "Tanggal verifikasi wajib diisi"
    },
    projectName: {
      label: "Nama Proyek",
      placeholder: "Masukkan nama proyek",
      required: "Nama proyek wajib diisi"
    },
    vesselId: {
      label: "Kapal",
      placeholder: "Pilih kapal",
      required: "Kapal wajib diisi"
    },
    linkDataEmployee: {
      label: "Tautan Data Pekerja",
      placeholder: "Masukkan tautan data pekerja",
      required: "Tautan data pekerja wajib diisi"
    },
    dateOfBirth: {
      label: "Tanggal Lahir",
      placeholder: "Pilih tanggal lahir",
      required: "Tanggal lahir wajib diisi"
    },
    location: {
      label: "Lokasi Barge",
      placeholder: "Masukkan lokasi",
      required: "Lokasi wajib diisi"
    },
    add: {
      title: "Tambah Pekerja Baru",
      description: "Silakan isi formulir di bawah ini untuk menambahkan pekerja baru."
    },
    update: {
      title: "Perbarui Informasi Pekerja",
      description: "Silakan isi formulir di bawah ini untuk memperbarui informasi pekerja."
    },
    delete: {
      title: "Hapus Pekerja",
      description: "Hapus pekerja dan semua datanya. Tindakan ini tidak dapat dibatalkan. Jadi, harap konfirmasi dengan hati-hati.",
      confirmationPrefix: "Apakah Anda yakin ingin menghapus ",
      confirmationSuffix: " ?",
      confirmText: "Hapus",
      cancelText: "Batal"
    },
    projectId: {
      label: "Nama Proyek",
      placeholder: "Pilih Proyek",
      required: "Proyek harus diisi"
    },
  }
};

export default employee;