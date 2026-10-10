/**
 * Bucket periode untuk seri tren. Semua perhitungan memakai **UTC** supaya
 * konsisten dengan helper analytics lain (`monthKeyUtc`, `monthSpanUtc`) dan
 * tidak bergeser oleh zona waktu server.
 */

export type PeriodBucket = 'month' | 'quarter';

/** Kunci periode sebuah tanggal: `2026-02` (bulan) atau `2026-Q2` (kuartal). */
export function bucketOf(date: Date, bucket: PeriodBucket): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth(); // 0-11
  if (bucket === 'quarter') return `${year}-Q${Math.floor(month / 3) + 1}`;
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

/**
 * Daftar periode (menaik) yang menyentuh rentang `from`..`to`, inklusif.
 * Bulan/kuartal tanpa transaksi tetap muncul (diisi 0 oleh pemanggil) supaya
 * bentuk grafik stabil.
 */
export function periodsBetween(from: Date, to: Date, bucket: PeriodBucket): string[] {
  const start = from.getTime() <= to.getTime() ? from : to;
  const end = from.getTime() <= to.getTime() ? to : from;
  const step = bucket === 'quarter' ? 3 : 1;
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  const out: string[] = [];
  while (cursor.getTime() <= last.getTime()) {
    out.push(bucketOf(cursor, bucket));
    cursor.setUTCMonth(cursor.getUTCMonth() + step);
  }
  return out;
}
