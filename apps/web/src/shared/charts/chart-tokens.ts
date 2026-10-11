/**
 * Palet & gaya chart bersama — SATU sumber untuk seluruh chart aplikasi.
 *
 * Nilai diimpor dari token Tailwind (bukan hex baru di komponen). Aturan repo
 * (lihat `widgets/dashboard-charts/chart-colors.ts`):
 * - Merah = aksi/kritis saja; TIDAK dipakai sebagai kategori.
 * - Seri kategori memakai palet aman buta warna.
 * - Mark ≥ 3:1 di atas putih (WCAG 1.4.11).
 *
 * Modul ini meng-ekspor ulang palet yang sudah ada agar komponen chart baru
 * (mis. di halaman proyek) memakai sumber yang sama, tanpa menulis hex sendiri.
 */
export { CHART, HEALTH_COLORS, AGING_COLORS, OUTCOME_COLORS, CATEGORICAL_COLORS, COST_COLORS, SEVERITY_COLORS } from '@/widgets/dashboard-charts/chart-colors';

/** Gaya tooltip bersama untuk semua chart recharts. */
export const CHART_TOOLTIP_STYLE = {
  borderRadius: 6,
  border: '1px solid #e4e4e7',
  fontSize: 13,
  fontFamily: 'IBM Plex Sans, sans-serif',
} as const;

/** Warna baris Gantt berdasarkan status/kritis. */
export const GANTT_COLORS = {
  /** Aktivitas jalur kritis — merah (kritis), bukan kategori. */
  critical: '#b91c1c',
  /** Aktivitas normal — netral kuat. */
  normal: '#3f3f46',
  /** Baseline (rencana beku) — netral terang. */
  baseline: '#d4d4d8',
  /** Milestone diamond. */
  milestone: '#1d4ed8',
  /** Garis "hari ini". */
  today: '#dc2626',
  grid: '#e4e4e7',
  axis: '#71717a',
} as const;

/** Warna distribusi status dokumen (kategorikal, bukan peringatan). */
export const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#71717a',
  PUBLISHED: '#2563eb',
  SUPERSEDED: '#a1a1aa',
  NOT_STARTED: '#71717a',
  IN_PROGRESS: '#d97706',
  SUBMITTED: '#0891b2',
  APPROVED: '#15803d',
  ISSUED: '#7c3aed',
  CLOSED: '#15803d',
  OPEN: '#b45309',
};

export function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? '#71717a';
}
