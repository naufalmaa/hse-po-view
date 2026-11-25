"""Generate a "negative control" evidence PDF (used by spec 06; test uploads only).
usage: python make_control_pdf.py <out.pdf> <irrelevant|deficient|blank> <element title>"""
import sys
import pymupdf

out, kind, title = sys.argv[1], sys.argv[2], sys.argv[3]
TEXT = {
    "irrelevant": (
        "RESEP NASI GORENG SPESIAL KELUARGA\n\nBahan: 3 piring nasi putih, 2 butir telur, 5 siung bawang merah, "
        "3 siung bawang putih, kecap manis 3 sendok makan, garam, merica, kerupuk, acar timun.\n\n"
        "Cara membuat: tumis bawang hingga harum, masukkan telur dan orak-arik, tambahkan nasi dan kecap manis, "
        "aduk rata selama 5 menit. Sajikan hangat dengan kerupuk dan acar.\n\nTips: gunakan nasi dingin semalam agar "
        "tidak lembek. Selamat mencoba!"
    ),
    "deficient": (
        f"DRAFT - {title}\n\nStatus: DRAFT / BELUM DISETUJUI / TIDAK BERLAKU\n\n"
        "Dokumen ini belum disusun secara lengkap. Prosedur tertulis belum ada. Sertifikat yang dilampirkan telah "
        "kedaluwarsa sejak 2019 dan belum diperpanjang. Tidak ada bukti pelaksanaan di lapangan, tidak ada tanda "
        "tangan persetujuan, tidak ada catatan audit maupun tindak lanjut temuan.\n\n"
        "Hasil audit internal: Kesesuaian Prosedur Tertulis 2 / 10; Kelengkapan Bukti Pelaksanaan 1 / 10; "
        "Validitas Sertifikat: TIDAK VALID."
    ),
    "blank": f"{title}\n\n-",
}[kind]
doc = pymupdf.open()
page = doc.new_page()
page.insert_textbox(pymupdf.Rect(50, 60, 545, 780), TEXT, fontsize=11)
doc.save(out)
