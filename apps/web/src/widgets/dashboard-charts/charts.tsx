import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { formatIdr } from '@/shared/lib/format';

const CHART_COLORS = {
  in: '#16a34a',
  out: '#dc2626',
  net: '#2563eb',
};

const HEALTH_COLORS: Record<string, string> = {
  ON_TRACK: '#22c55e',
  AT_RISK: '#f59e0b',
  CRITICAL: '#ef4444',
  NO_BUDGET: '#a1a1aa',
};

const tooltipStyle = {
  borderRadius: 6,
  border: '1px solid #e4e4e7',
  fontSize: 13,
  fontFamily: 'IBM Plex Sans, sans-serif',
};

/** Bar chart cash flow bulanan: cash in vs out. */
export function CashFlowChart({ data }: { data: { month: string; cashIn: number; cashOut: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={{ stroke: '#e4e4e7' }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${Math.round(v / 1e6)}jt`} width={48} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [formatIdr(Number(value)), name === 'cashIn' ? 'Cash In' : 'Cash Out']} cursor={{ fill: '#f4f4f5' }} />
        <Bar dataKey="cashIn" fill={CHART_COLORS.in} radius={[3, 3, 0, 0]} maxBarSize={28} name="cashIn" />
        <Bar dataKey="cashOut" fill={CHART_COLORS.out} radius={[3, 3, 0, 0]} maxBarSize={28} name="cashOut" />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Donut distribusi project health. */
export function HealthDonut({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={56} outerRadius={82} paddingAngle={2} strokeWidth={0}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={HEALTH_COLORS[entry.name] ?? '#a1a1aa'} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [Number(value), name]} />
      </PieChart>
    </ResponsiveContainer>
  );
}
