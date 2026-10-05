/**
 * Warna chart bersumber dari token design system (`packages/config/tailwind/tailwind.preset.cjs`).
 * Setiap nilai di bawah mencerminkan token; jangan tulis hex baru di komponen — impor dari sini.
 */
import type { Portfolio } from '@aec/api-contracts';

/** Warna struktur chart (grid, sumbu, tooltip, arus kas). */
export const CHART = {
  /** neutral-200 */
  grid: '#e4e4e7',
  /** neutral-500 */
  axis: '#71717a',
  /** neutral-100 */
  cursor: '#f4f4f5',
  /** success-600 */
  positive: '#16a34a',
  /** destructive-600 */
  negative: '#dc2626',
  /** racing-red-600 */
  accent: '#dc2626',
} as const;

/** Warna health — project-on-track/at-risk/critical-500 + neutral-400. */
export const HEALTH_COLORS: Record<Portfolio['items'][number]['health'], string> = {
  ON_TRACK: '#22c55e',
  AT_RISK: '#f59e0b',
  CRITICAL: '#ef4444',
  NO_BUDGET: '#a1a1aa',
};

/** Warna bucket aging (CURRENT → 90+) — hijau → abu → kuning → oranye → merah. */
export const AGING_COLORS = ['#22c55e', '#a1a1aa', '#f59e0b', '#f97316', '#ef4444'];

/** Warna komposisi biaya per `costType`, dari ramp token yang ada. */
export const COST_COLORS: Record<string, string> = {
  MATERIAL: '#dc2626', // racing-red-600
  LABOR: '#2563eb', // info-600
  SUBCONTRACTOR: '#f59e0b', // warning-500
  EQUIPMENT: '#16a34a', // success-600
  DIRECT: '#71717a', // neutral-500
  INDIRECT: '#a1a1aa', // neutral-400
  OVERHEAD: '#52525b', // neutral-600
};
