/**
 * Delta metrik periode ini vs periode sebelumnya. `pctChange` null bila pembanding 0.
 */
export function computeDelta(
  current: number,
  previous: number,
): { current: number; previous: number; pctChange: number | null; direction: 'up' | 'down' | 'flat' } {
  const pctChange = previous !== 0 ? Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10 : null;
  const direction = current > previous ? 'up' : current < previous ? 'down' : 'flat';
  return { current, previous, pctChange, direction };
}

/**
 * Kelompokkan baris bertimestamp menjadi seri bulanan (6 bulan terakhir, termasuk
 * bulan berjalan). Bulan tanpa baris diisi 0 supaya grafik tidak "melebar" palsu.
 * `value` boleh jumlah baris (default 1 per baris) atau nilai numerik yang disediakan.
 *
 * PENTING: ini mengukur **aliran** (berapa banyak dibuat/bulan), bukan **stok**
 * (berapa banyak terbuka saat itu). Label UI harus mencerminkan itu.
 */
export function monthlySeries(
  rows: { at: Date; value?: number }[],
  now: Date = new Date(),
  months = 6,
): { month: string; value: number }[] {
  const key = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  const buckets = new Map<string, number>();
  const monthsList: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const k = key(d);
    monthsList.push(k);
    buckets.set(k, 0);
  }
  for (const r of rows) {
    const k = key(r.at);
    if (!buckets.has(k)) continue; // di luar jendela 6 bulan
    buckets.set(k, (buckets.get(k) ?? 0) + (r.value ?? 1));
  }
  return monthsList.map((month) => ({ month, value: Math.round((buckets.get(month) ?? 0) * 100) / 100 }));
}
