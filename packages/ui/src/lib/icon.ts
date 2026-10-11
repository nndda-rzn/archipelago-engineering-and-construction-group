/**
 * Standar stroke ikon aplikasi — SATU nilai untuk seluruh UI.
 *
 * Lucide default `strokeWidth=2` terasa lebih tebal dari garis UI kita yang
 * halus (hairline 1px, mono kecil). Semua ikon memakai `ICON_STROKE` agar bobot
 * visualnya konsisten antar halaman. Lihat skill design: "standardize stroke
 * width across all icons".
 */
export const ICON_STROKE = 1.5 as const;

/** Ukuran ikon standar (px) untuk konteks umum. */
export const ICON_SIZE = {
  /** Ikon inline dalam teks/baris padat. */
  sm: 14,
  /** Ikon default tombol/label. */
  md: 16,
  /** Ikon kepala panel. */
  lg: 20,
} as const;
