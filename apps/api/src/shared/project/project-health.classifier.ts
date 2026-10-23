export type HealthStatus = 'NO_BUDGET' | 'ON_TRACK' | 'AT_RISK' | 'CRITICAL';

export interface HealthResult {
  utilization: number | null;
  health: HealthStatus;
  /**
   * True bila SPI tidak tersedia (planned value = 0), sehingga status hanya
   * dinilai dari CPI. Ditandai supaya UI bisa menyatakan bahwa penilaiannya
   * tidak lengkap, bukan menyembunyikannya.
   */
  partial: boolean;
}

/**
 * Kesehatan proyek dinilai dari CPI dan SPI, bukan dari tingkat penyerapan biaya.
 *
 * Kenapa bukan utilization: utilization tinggi bisa berarti proyek boros, tapi
 * bisa juga berarti proyek sudah hampir selesai. Sebaliknya utilization rendah
 * bisa berarti hemat, atau bisa berarti proyek belum mengerjakan apa pun.
 * Di data dev, aturan lama menyebut SEMUA 10 proyek "ON_TRACK" padahal empat di
 * antaranya CPI 0,85 dan SPI 0,63 — boros 15% dan terlambat 37%.
 *
 * Ambang 1,0 mengikuti standar EVM (PMI/AACE): CPI >= 1 berarti biaya sesuai
 * atau lebih baik dari rencana, SPI >= 1 berarti jadwal sesuai atau lebih cepat.
 *
 * `utilization` tetap dihitung karena berguna sebagai angka, tetapi ia BUKAN
 * penentu status.
 */
export function classifyHealth(
  cpi: number | null,
  spi: number | null,
  utilization: number | null = null,
): HealthResult {
  if (cpi == null) {
    return { utilization, health: 'NO_BUDGET', partial: false };
  }

  // SPI tidak tersedia: nilai dari CPI saja, dan nyatakan penilaiannya parsial.
  if (spi == null) {
    return {
      utilization,
      health: cpi >= 1 ? 'ON_TRACK' : 'AT_RISK',
      partial: true,
    };
  }

  const costOk = cpi >= 1;
  const scheduleOk = spi >= 1;

  if (costOk && scheduleOk) return { utilization, health: 'ON_TRACK', partial: false };
  if (!costOk && !scheduleOk) return { utilization, health: 'CRITICAL', partial: false };
  return { utilization, health: 'AT_RISK', partial: false };
}
