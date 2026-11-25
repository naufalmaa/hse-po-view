export default {
    title: 'Detail Log POB Tidak Cocok',
    description: 'Detail dari log POB dengan data yang tidak cocok',
    back: 'Kembali ke Daftar',
    suggestedMatches: 'Kesesuaian Data',
    name: 'Nama',
    ePassport: 'E-Passport',
    company: 'Kontraktor',
    department: 'Departemen',
    details: {
        file: 'Berkas',
        logId: 'ID Log',
        stats: {
            totalUnmatched: 'Total Tidak Cocok',
            withSuggestions: 'Dengan Saran',
            highConfidence: 'Kepastian Tinggi (>80%)',
            noSuggestions: 'Tanpa Saran'
        },
        tabs: {
            withSuggestions: 'Dengan Saran',
            withoutSuggestions: 'Tanpa Saran'
        }
    },
    error: {
        failedToLoad: 'Gagal Memuat Detail Log',
        unexpectedError: 'Terjadi kesalahan tak terduga saat mengambil data.',
        goBack: 'Kembali',
        tryAgain: 'Coba Lagi',
        logNotFound: 'Log Tidak Ditemukan',
        logNotFoundMessage: 'Detail log yang Anda cari tidak ada atau telah dihapus.',
        backToLogs: 'Kembali ke Log'
    },
    tabs: {
        withSuggestions: 'Dengan Saran ({{count}})',
        withoutSuggestions: 'Tanpa Saran ({{count}})'
    },
    pagination: {
        previous: 'Sebelumnya',
        next: 'Selanjutnya'
    },
    emptyStates: {
        withSuggestions: 'Tidak ada item dengan saran yang ditemukan',
        withoutSuggestions: 'Tidak ada item tanpa saran yang ditemukan'
    },
    stats: {
        totalUnmatched: 'Total Tidak Cocok',
        withSuggestions: 'Dengan Saran',
        highConfidence: 'Kepastian Tinggi (>80%)',
        noSuggestions: 'Tanpa Saran',
        totalUnmatchedDesc: 'Total entri tidak cocok dalam log',
        withSuggestionsDesc: 'Entri dengan potensi kecocokan ditemukan',
        highConfidenceDesc: 'Kecocokan dengan skor kemiripan tinggi',
        noSuggestionsDesc: 'Entri tanpa saran kecocokan'
    },
    filters: {
        title: 'Filter',
        filter: 'Filter',
        all: 'Semua',
        sortBy: 'Urutkan Berdasarkan',
        sortOrder: 'Urutan',
        withSuggestion: 'Dengan Saran',
        withoutSuggestion: 'Tanpa Saran',
        selectFilter: 'Pilih Filter',
        selectSortBy: 'Pilih Urutan',
        selectOrderBy: 'Pilih Arah Urutan',
        similarity: 'Kemiripan',
        name: 'Nama'
    },
    confirmResolve: {
        title: 'Konfirmasi Penyelesaian',
        description: 'Apakah Anda yakin ingin menyelesaikan item yang tidak cocok ini dengan <highlighter>{{suggestionName}}</highlighter> ?',
        confirm: 'Ya, Selesaikan',
        cancel: 'Batal'
    },
    actions: {
        title: 'Aksi',
        createEmployee: 'Tambah Pekerja',
        createCompany: 'Tambah Kontraktor'
    }
};