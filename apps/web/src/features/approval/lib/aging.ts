/**
 * Umur task approval — satu-satunya sumber untuk "sudah menunggu berapa lama"
 * dan seberapa mendesak. Fungsi murni (waktu disuntikkan) agar bisa diuji dan
 * tidak bergantung pada jam saat render.
 *
 * Ambang di sini **eksplisit dan sengaja kasar**: ini isyarat triase, bukan SLA
 * kontraktual. Ubah konstanta ini bila kebijakan SLA berubah.
 */

/** Task yang menunggu >= 3 hari dianggap terlambat. */
export const OVERDUE_DAYS = 3;
/** Task yang menunggu >= 1 hari ditandai "due soon". */
export const DUE_SOON_DAYS = 1;

export type AgingLevel = 'ok' | 'due-soon' | 'overdue';

export interface Aging {
  days: number;
  level: AgingLevel;
  /** 0..1 terhadap OVERDUE_DAYS (dipakai untuk panjang bar). Dibatasi 1. */
  ratio: number;
}

/**
 * Selisih hari kalender penuh antara `from` dan `now`.
 * Aman: timestamp tak valid atau di masa depan menghasilkan 0 (bukan NaN/negatif).
 */
export function ageInDays(from: string | Date | null | undefined, now: Date = new Date()): number {
  if (from == null || from === '') return 0;
  const date = from instanceof Date ? from : new Date(from);
  if (Number.isNaN(date.getTime())) return 0;
  const diffMs = now.getTime() - date.getTime();
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / 86_400_000);
}

export function agingFrom(from: string | Date | null | undefined, now: Date = new Date()): Aging {
  const days = ageInDays(from, now);
  const level: AgingLevel = days >= OVERDUE_DAYS ? 'overdue' : days >= DUE_SOON_DAYS ? 'due-soon' : 'ok';
  const ratio = Math.min(1, Math.max(0, days / OVERDUE_DAYS));
  return { days, level, ratio };
}

/**
 * Label teks untuk umur. Teks adalah sinyal UTAMA — warna hanya penguat, supaya
 * makna tetap terbaca tanpa penglihatan warna (WCAG 1.4.1).
 */
export function agingLabel(aging: Aging): string {
  const age = aging.days === 0 ? 'today' : aging.days === 1 ? '1 day ago' : `${aging.days} days ago`;
  if (aging.level === 'overdue') return `${age} · Overdue`;
  if (aging.level === 'due-soon') return `${age} · Due soon`;
  return age;
}
