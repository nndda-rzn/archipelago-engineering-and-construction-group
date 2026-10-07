import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState } from '@aec/ui';
import { formatIdr, formatIdrAxis } from '@/shared/lib/format';
import { CHART } from './chart-colors';

export interface CashFlowSeriesPoint {
  month: string;
  cashIn: number;
  cashOut: number;
  net: number;
}

/** Tambahkan kolom net kumulatif untuk garis tren. */
export function toAreaSeries(series: CashFlowSeriesPoint[]): { month: string; net: number; cumulative: number }[] {
  let running = 0;
  return series.map((p) => {
    running += p.net;
    return { month: p.month, net: p.net, cumulative: running };
  });
}

const tooltipStyle = {
  borderRadius: 6,
  border: `1px solid ${CHART.grid}`,
  fontSize: 13,
  fontFamily: 'IBM Plex Sans, sans-serif',
};

export function CashFlowArea({ series }: { series: CashFlowSeriesPoint[] }) {
  if (series.length === 0) {
    return <EmptyState title="No cash movement" description="No collections or payments in this period." />;
  }

  const data = toAreaSeries(series);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="cashNetFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.positive} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CHART.positive} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: CHART.axis }} axisLine={{ stroke: CHART.grid }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: CHART.axis }} axisLine={false} tickLine={false} tickFormatter={formatIdrAxis} width={64} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, name) => [formatIdr(Number(value)), name === 'cumulative' ? 'Cumulative net' : 'Monthly net']}
          cursor={{ fill: CHART.cursor }}
        />
        <Area type="monotone" dataKey="cumulative" stroke={CHART.positive} strokeWidth={2} fill="url(#cashNetFill)" name="cumulative" />
        <Line type="monotone" dataKey="net" stroke={CHART.axis} strokeWidth={1} dot={false} name="net" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
