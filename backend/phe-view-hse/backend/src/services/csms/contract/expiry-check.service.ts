/**
 * Check status kedaluwarsa untuk kontrak
 * - expired: tanggal sudah lewat
 * - warning: tanggal <= 30 hari lagi (1 bulan)
 * - null: masih aman
 */
export async function getContractExpiryStatus(date: string | Date | null | undefined): Promise<'expired' | 'warning' | null> {
  if (!date) return null;
  const now = new Date();
  const expiry = new Date(date);
  const diff = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (diff < 0) return 'expired';
  if (diff <= 30) return 'warning'; // 1 month warning (H-1 Bulan)
  return null;
}
