/**
 * Kunci bulan UTC — `2026-10-06T…` → `2026-10`.
 *
 * Sengaja UTC (bukan waktu lokal) supaya konsisten di seluruh modul: bulan yang
 * sama tidak boleh terbelah oleh zona waktu server. Sebelumnya disalin di modul
 * analytics dan approval; kini satu sumber.
 */
export function monthKeyUtc(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
