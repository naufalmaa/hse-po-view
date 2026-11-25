/**
 * Cek status kedaluwarsa untuk kualifikasi
 * - expired: tanggal sudah lewat
 * - warning: tanggal <= 60 hari lagi (2 bulan)
 * - null: masih aman
 */
export async function getQualificationExpiryStatus(date: string | Date | null | undefined): Promise<'expired' | 'warning' | null> {
  if (!date) return null;
  const now = new Date();
  const expiry = new Date(date);
  const diff = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (diff < 0) return 'expired';
  if (diff <= 60) return 'warning'; // 2 months warning
  return null;
}