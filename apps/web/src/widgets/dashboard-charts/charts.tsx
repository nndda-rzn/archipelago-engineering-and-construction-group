import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { formatIdr } from '@/shared/lib/format';
import { AGING_COLORS, CHART } from './chart-colors';

const tooltipStyle = {
  borderRadius: 6,
  border: `1px solid ${CHART.grid}`,
  fontSize: 13,
  fontFamily: 'IBM Plex Sans, sans-serif',
};

export function CashFlowChart({ data }: { data: { month: string; cashIn: number; cashOut: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: CHART.axis }} axisLine={{ stroke: CHART.grid }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: CHART.axis }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${Math.round(v / 1e6)}jt`} width={48} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [formatIdr(Number(value)), name === 'cashIn' ? 'Cash In' : 'Cash Out']} cursor={{ fill: CHART.cursor }} />
        <Bar dataKey="cashIn" fill={CHART.positive} radius={[3, 3, 0, 0]} maxBarSize={28} name="cashIn" />
        <Bar dataKey="cashOut" fill={CHART.negative} radius={[3, 3, 0, 0]} maxBarSize={28} name="cashOut" />
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
