import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DeltaBadge, EmptyState, ErrorState, SegmentedControl, ChartSkeleton } from '@aec/ui';
import type { TrendSeries } from '@aec/api-contracts';
import { formatIdr, formatIdrAxis } from '@/shared/lib/format';
import { Money } from '@/shared/ui/money';
import { CHART } from '@/widgets/dashboard-charts/chart-colors';
import { useTrendSeries } from '../model/analytics.api';
import type { DashboardFilter } from '@/shared/lib/dashboard-period';

const METRIC_OPTIONS = [
  { value: 'cashIn', label: 'Cash in' },
  { value: 'cashOut', label: 'Cash out' },
  { value: 'netCash', label: 'Net cash' },
  { value: 'cost', label: 'Cost' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'budget', label: 'Budget' },
];

const METRIC_LABEL: Record<string, string> = Object.fromEntries(METRIC_OPTIONS.map((o) => [o.value, o.label]));

const tooltipStyle = {
  borderRadius: 6,
  border: `1px solid ${CHART.grid}`,
  fontSize: 13,
  fontFamily: 'IBM Plex Sans, sans-serif',
};

export interface TrendExplorerViewProps {
  metric: string;
  onMetricChange: (value: string) => void;
  data?: TrendSeries;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

/**
 * Zona 1 — Trend explorer. Menjawab "bagaimana pergerakannya": nilai periode +
 * delta vs periode lalu + seri bulanan dengan garis pembanding putus-putus.
 * Selalu menyertakan ringkasan teks di samping chart (dapat dibaca tanpa warna).
 */
export function TrendExplorerView({ metric, onMetricChange, data, isLoading, isError, onRetry }: TrendExplorerViewProps) {
  const label = METRIC_LABEL[metric] ?? metric;

  return (
    <section aria-label="Trend explorer" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-h2 text-neutral-950">Trend explorer</h2>
        <SegmentedControl aria-label="Metric" options={METRIC_OPTIONS} value={metric} onValueChange={onMetricChange} />
      </div>

      {isLoading ? (
        <ChartSkeleton />
      ) : isError ? (
        <div role="alert">
          <ErrorState message="The trend could not be loaded." onRetry={onRetry ?? (() => {})} />
        </div>
      ) : !data || data.points.length === 0 ? (
        <EmptyState title="No trend data" description="No movement for this metric in the selected scope." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="flex min-w-0 flex-col gap-1 lg:col-span-1">
            <p className="text-caption text-neutral-500">{label} · period total</p>
            <p className="font-mono text-h1 tabular-nums text-neutral-950" title={formatIdr(data.total)}>
              {formatIdrAxis(data.total)}
            </p>
            {data.delta && <DeltaBadge pct={data.delta.pctChange} direction={data.delta.direction} />}
            {data.compareTotal != null && (
              <p className="text-caption text-neutral-500">
                Previous: <Money value={data.compareTotal} className="font-mono tabular-nums" />
              </p>
            )}
          </div>

          <figure
            className="lg:col-span-3"
            role="img"
            aria-label={`${label} trend over ${data.points.length} periods, total ${formatIdr(data.total)}`}
          >
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={mergeSeries(data)} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: CHART.axis }} axisLine={{ stroke: CHART.grid }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: CHART.axis }} axisLine={false} tickLine={false} tickFormatter={formatIdrAxis} width={64} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value, name) => [formatIdr(Number(value)), name === 'previous' ? 'Previous' : 'Current']}
                  cursor={{ stroke: CHART.gridStrong }}
                />
                <Line type="monotone" dataKey="current" stroke={CHART.strong} strokeWidth={2} dot={false} name="current" />
                {data.comparePoints && (
                  <Line type="monotone" dataKey="previous" stroke={CHART.axis} strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="previous" />
                )}
              </LineChart>
            </ResponsiveContainer>
          </figure>
        </div>
      )}
    </section>
  );
}

/** Gabungkan seri current & previous menjadi satu larik per periode untuk recharts. */
function mergeSeries(data: TrendSeries): { period: string; current: number; previous: number | null }[] {
  const prev = new Map((data.comparePoints ?? []).map((p) => [p.period, p.value]));
  return data.points.map((p) => ({ period: p.period, current: p.value, previous: prev.get(p.period) ?? null }));
}

/** Zona 1 terhubung: menarik seri tren untuk metrik + scope terpilih. */
export function TrendExplorer({
  metric,
  onMetricChange,
  filter,
  compare,
}: {
  metric: string;
  onMetricChange: (value: string) => void;
  filter: DashboardFilter;
  compare: boolean;
}) {
  const query = useTrendSeries({ metric, compare: compare ? 'previous' : undefined }, filter);
  return (
    <TrendExplorerView
      metric={metric}
      onMetricChange={onMetricChange}
      data={query.data}
      isLoading={query.isLoading}
      isError={query.isError}
      onRetry={() => query.refetch()}
    />
  );
}
