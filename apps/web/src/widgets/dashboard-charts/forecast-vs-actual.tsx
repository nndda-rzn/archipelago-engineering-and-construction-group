import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState } from '@aec/ui';
import type { ForecastVsActual } from '@aec/api-contracts';
import { formatIdr, formatIdrAxis } from '@/shared/lib/format';
import { CHART } from './chart-colors';

/**
 * Rencana vs realisasi kas bersih per periode — **grouped bar** (perbandingan dua
 * seri pada kategori yang sama). Bukan garis, karena ini perbandingan, bukan tren
 * kontinu.
 */
export function ForecastVsActualChart({ periods }: { periods: ForecastVsActual['periods'] }) {
  if (periods.length === 0) {
    return <EmptyState title="No cash forecast" description="Create a cash forecast to compare it against actuals." />;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={periods} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="period" tick={{ fontSize: 11, fill: CHART.axis }} axisLine={{ stroke: CHART.grid }} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: CHART.axis }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatIdrAxis}
          width={64}
        />
        <Tooltip
          contentStyle={{ borderRadius: 6, border: `1px solid ${CHART.grid}`, fontSize: 13, fontFamily: 'IBM Plex Sans, sans-serif' }}
          formatter={(value, name) => [formatIdr(Number(value)), name === 'forecastNet' ? 'Forecast net' : 'Actual net']}
          cursor={{ fill: CHART.cursor }}
        />
        <Legend formatter={(value) => (value === 'forecastNet' ? 'Forecast net' : 'Actual net')} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="forecastNet" fill={CHART.axis} radius={[3, 3, 0, 0]} maxBarSize={28} name="forecastNet" />
        <Bar dataKey="actualNet" fill={CHART.positive} radius={[3, 3, 0, 0]} maxBarSize={28} name="actualNet" />
      </BarChart>
    </ResponsiveContainer>
  );
}
