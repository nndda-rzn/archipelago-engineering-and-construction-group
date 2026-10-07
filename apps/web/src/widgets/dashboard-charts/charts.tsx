import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { formatIdr, formatIdrAxis } from '@/shared/lib/format';
import { AGING_COLORS, CHART } from './chart-colors';
import { AnnotatedChart } from './annotated-chart';

/**
 * Arus kas 12 bulan: **grouped bar** (cash in/out) + **garis net**.
 *
 * Fungsi tiap encoding:
 * - Bar in/out menjawab "bulan ini masuk/keluar berapa" (perbandingan dua besaran
 *   per periode → bar, bukan area/donut).
 * - Garis net (cashIn − cashOut) menjawab "kas menumpuk atau terkuras" (tren seri
 *   turunan → garis), dengan garis nol sebagai acuan.
 *
 * `net` dihitung lokal agar aman bila pemanggil hanya mengirim in/out; bila
 * `net` sudah ada di data, nilai itu yang dipakai.
 */
export function CashFlowChart({ data }: { data: { month: string; cashIn: number; cashOut: number; net?: number }[] }) {
  const series = data.map((d) => ({ ...d, net: d.net ?? d.cashIn - d.cashOut }));
  const totals = cashFlowSummary(series);
  const netTone = totals.net >= 0 ? 'text-success-700' : 'text-destructive-700';

  if (series.length === 0) {
    return <p className="py-6 text-center text-body-sm text-neutral-500">No cash movement in this period.</p>;
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={series} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="25%" barGap={4}>
          <CartesianGrid strokeDasharray="2 4" stroke={CHART.grid} strokeOpacity={0.7} vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: CHART.axis }} axisLine={{ stroke: CHART.grid }} tickLine={false} />
          {/* Sumbu memakai unit eksplisit (Rp … jt), bukan singkatan "jt" tanpa konteks. */}
          <YAxis tick={{ fontSize: 11, fill: CHART.axis }} axisLine={false} tickLine={false} tickFormatter={formatIdrAxis} width={64} />
          {/* Anotasi bersama: garis nol + legend (di atas) + tooltip bernama. */}
          <AnnotatedChart
            zeroLine
            showLegend
            legendPosition="top"
            formatValue={formatIdr}
            seriesNames={{ cashIn: 'Cash in', cashOut: 'Cash out', net: 'Net' }}
          >
            <Bar dataKey="cashIn" fill={CHART.positive} radius={[3, 3, 0, 0]} maxBarSize={28} name="cashIn" />
            <Bar dataKey="cashOut" fill={CHART.negative} radius={[3, 3, 0, 0]} maxBarSize={28} name="cashOut" />
            <Line type="monotone" dataKey="net" stroke={CHART.strong} strokeWidth={2} strokeDasharray="4 3" dot={false} name="net" />
          </AnnotatedChart>
        </ComposedChart>
      </ResponsiveContainer>
      {/* Padanan non-warna: ringkasan In/Out/Net sebagai teks. */}
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-body-sm text-neutral-600">
        <span>
          Total in <span className="font-mono tabular-nums text-success-700">{formatIdrAxis(totals.in)}</span>
        </span>
        <span>
          Total out <span className="font-mono tabular-nums text-destructive-600">{formatIdrAxis(totals.out)}</span>
        </span>
        <span>
          Net <span className={`font-mono font-medium tabular-nums ${netTone}`}>{formatIdrAxis(totals.net)}</span>
        </span>
      </div>
    </div>
  );
}

/** Ringkasan total in/out/net dari seri arus kas (fungsi murni, mudah diuji). */
export function cashFlowSummary(series: { cashIn: number; cashOut: number }[]): { in: number; out: number; net: number } {
  const totalIn = series.reduce((s, d) => s + d.cashIn, 0);
  const totalOut = series.reduce((s, d) => s + d.cashOut, 0);
  return { in: totalIn, out: totalOut, net: totalIn - totalOut };
}

/** Batang tersegmentasi bucket aging (AR/AP). Aksesibel via aria-label berisi nilai. */
export function AgingBar({ buckets, label }: { buckets: { label: string; value: number }[]; label: string }) {
  const total = buckets.reduce((s, b) => s + b.value, 0);
  if (total <= 0) return <p className="text-body-sm text-neutral-500">No outstanding {label}.</p>;
  return (
    <div
      role="img"
      aria-label={`${label}: ${buckets.map((b) => `${b.label} ${formatIdr(b.value)}`).join(', ')}`}
      className="flex h-4 overflow-hidden rounded-md"
    >
      {buckets.map((b, i) => (
        <div key={b.label} style={{ width: `${(b.value / total) * 100}%`, backgroundColor: AGING_COLORS[i] }} />
      ))}
    </div>
  );
}
