export default {
    title: "Update POB Absensi",
    description: "Unggah file Excel untuk mengubah dan memperbarui status Personnel On Board (POB).",
    unmatchedLogs: "Unmatched Logs",
    upload: {
        title: "Unggah File",
        description: "Pilih file Excel POB untuk diproses.",
        label: "File Excel",
        button: "Analisis File",
        fileName: "Nama File"
    },
    stats: {
        marine: "Marine",
        project: "Project",
        mitra: "Mitra",
        detected: "Pekerja dari file"
    },
    form: {
        title: "Konfigurasi Pembaruan",
        description: "Konfigurasikan bagaimana data harus diproses dan diperbarui.",
        categoryLabel: "Pilih Kategori untuk Diperbarui",
        categoryPlaceholder: "Pilih kategori...",
        enableUpdates: "Aktifkan Pembaruan Status",
        unmatched: "Rekaman Tidak Cocok Tercatat",
        unmatchedDesc: "Beberapa rekaman tidak dapat dicocokkan. ID Log: {{logId}}",
        cancel: "Batal & Reset",
        confirm: "Konfirmasi & Proses Pembaruan"
    },
    categories: {
        marine: "Marine",
        project: "Project",
        mitra: "Mitra"
    },
    table: {
        name: "Nama",
        project: "Proyek",
        idNumber: "No. Identitas",
        passport: "HSSE e-Passport",
        status: "Status Saat Ini"
    },
    actions: {
        selectForUpdate: "Pilih untuk Diperbarui",
        enableStatusUpdate: "Aktifkan Pembaruan Status",
        processSelected: "Perbaharui"
    },
    confirmation: {
        title: "Konfirmasi Pembaruan",
        description: "Anda akan memperbarui data untuk {{count}} kategori terpilih. Tindakan ini tidak dapat dibatalkan. Apakah Anda yakin ingin melanjutkan?",
        descriptionWithStatus: "Apakah Anda yakin ingin mengubah status duty menjadi {{status}} untuk semua pekerja {{category}}? Tindakan ini tidak dapat dibatalkan.",
        cancel: "Batal",
        confirm: "Ya, Perbaharui"
    }
}
