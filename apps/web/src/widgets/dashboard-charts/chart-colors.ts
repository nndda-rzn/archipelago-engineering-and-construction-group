/**
 * Palet chart bersama untuk SELURUH aplikasi (dashboard + approval/workflow).
 *
 * PENTING — blast radius: file ini dipakai lintas-halaman
 * (`apps/web/src/features/approval/ui/workflow-insights-charts.tsx` juga
 * mengimpornya). Mengubah sebuah nilai di sini mengubah setiap chart di app.
 * Itulah sebabnya palet ini **sengaja** menjadi satu sumber: dulu dua tempat
 * mendefinisikan warna sendiri dan hasilnya tidak konsisten. Setiap perubahan
 * wajib diperiksa terhadap seluruh konsumen.
 *
 * Aturan (FR-DASH-010):
 * - Merah = aksi/kritis saja; tidak dipakai sebagai kategori.
 * - Mark data memakai shade 600/700 agar ≥ 3:1 di atas putih (WCAG 1.4.11).
 * - Ramp terurut (aging, severity) harus monoton.
 * - Seri kategorikal memakai palet aman buta warna (biru/oranye/teal/ungu/…).
 */
import type { Portfolio } from '@aec/api-contracts';

/** Warna struktur chart (grid, sumbu, tooltip, arus kas). */
export const CHART = {
  /** neutral-200 */
  grid: '#e4e4e7',
  /** neutral-300 — garis referensi/kuadran yang lebih tegas dari `grid`. */
  gridStrong: '#d4d4d8',
  /** neutral-500 */
  axis: '#71717a',
  /** neutral-100 */
  cursor: '#f4f4f5',
  /** success-700 — cash in / nilai positif (≥ 3:1). */
  positive: '#15803d',
  /** destructive-700 — cash out / nilai negatif (≥ 3:1). */
  negative: '#b91c1c',
  /** racing-red-600 — aksen aksi; JANGAN dipakai sebagai kategori data. */
  accent: '#dc2626',
  /** neutral-800 — seri utama yang harus lebih tegas dari `axis`. */
  strong: '#27272a',
  /** info-700 — seri netral-informatif (mis. forecast) yang tetap terbaca. */
  info: '#1d4ed8',
} as const;

/**
 * Warna health — memakai shade 600/700 agar titik tetap terbaca di atas putih.
 * Dot hijau/kuning versi 500 (#22c55e/#f59e0b) hanya ~2:1 dan gagal WCAG 1.4.11.
 */
export const HEALTH_COLORS: Record<Portfolio['items'][number]['health'], string> = {
  ON_TRACK: '#15803d', // success-700
  AT_RISK: '#b45309', // warning-700
  CRITICAL: '#b91c1c', // destructive-700
  NO_BUDGET: '#71717a', // neutral-500
};

/** Warna bucket aging (CURRENT → 90+) — ramp MONOTON hijau→kuning→merah. */
export const AGING_COLORS = ['#16a34a', '#65a30d', '#ca8a04', '#ea580c', '#b91c1c'];

/**
 * Warna hasil approval (approved / rejected / pending / cancelled).
 * Makna tetap konsisten dengan StackedBar: sukses = hijau, ditolak = merah,
 * menunggu = kuning, batal = netral. Shade dinaikkan agar terbaca.
 */
export const OUTCOME_COLORS = {
  approved: '#15803d', // success-700
  rejected: '#b91c1c', // destructive-700
  pending: '#b45309', // warning-700
  cancelled: '#71717a', // neutral-500
} as const;

/**
 * Palet kategorikal aman buta warna (biru/oranye/teal/ungu/abu/rose). Dipakai
 * untuk seri yang **tidak** punya makna peringatan (mis. jenis biaya, klien),
 * sehingga merah tidak lagi dipakai sebagai kategori.
 */
export const CATEGORICAL_COLORS = ['#2563eb', '#d97706', '#0891b2', '#7c3aed', '#71717a', '#be185d'];

/** Warna komposisi biaya per `costType`, dari palet kategorikal (bukan merah). */
export const COST_COLORS: Record<string, string> = {
  MATERIAL: '#2563eb', // categorical 1
  LABOR: '#d97706', // categorical 2
  SUBCONTRACTOR: '#0891b2', // categorical 3
  EQUIPMENT: '#7c3aed', // categorical 4
  DIRECT: '#71717a', // categorical 5
  INDIRECT: '#be185d', // categorical 6
  OVERHEAD: '#52525b', // neutral-600 — "lainnya"
};

/** Warna severity exception (HIGH/MEDIUM/LOW) — shade 700 agar ≥ 3:1. */
export const SEVERITY_COLORS = {
  HIGH: '#b91c1c',
  MEDIUM: '#b45309',
  LOW: '#1d4ed8',
} as const;
