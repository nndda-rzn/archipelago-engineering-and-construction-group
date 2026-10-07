import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { formatIdr, formatIdrAxis } from '@/shared/lib/format';
import { AGING_COLORS, CHART } from './chart-colors';
import { AnnotatedChart } from './annotated-chart';

export function CashFlowChart({ data }: { data: { month: string; cashIn: number; cashOut: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: CHART.axis }} axisLine={{ stroke: CHART.grid }} tickLine={false} />
        {/* Sumbu memakai unit eksplisit (Rp … jt), bukan singkatan "jt" tanpa konteks. */}
        <YAxis tick={{ fontSize: 11, fill: CHART.axis }} axisLine={false} tickLine={false} tickFormatter={formatIdrAxis} width={64} />
        {/* Anotasi bersama: garis nol + legend + tooltip bernama. */}
        <AnnotatedChart zeroLine showLegend formatValue={formatIdr} seriesNames={{ cashIn: 'Cash in', cashOut: 'Cash out' }}>
          <Bar dataKey="cashIn" fill={CHART.positive} radius={[3, 3, 0, 0]} maxBarSize={28} name="cashIn" />
          <Bar dataKey="cashOut" fill={CHART.negative} radius={[3, 3, 0, 0]} maxBarSize={28} name="cashOut" />
        </AnnotatedChart>
      </BarChart>
    </ResponsiveContainer>
  );
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
