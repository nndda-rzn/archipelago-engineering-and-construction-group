import { Link } from '@tanstack/react-router';
import { EmptyState, ErrorState, SegmentedControl, ChartSkeleton } from '@aec/ui';
import type { Decomposition } from '@aec/api-contracts';
import { formatIdr } from '@/shared/lib/format';
import { CHART } from '@/widgets/dashboard-charts/chart-colors';
import { useDecomposition } from '../model/analytics.api';
import type { DashboardFilter } from '@/shared/lib/dashboard-period';

/** Dimensi yang diizinkan per metrik — cermin `metric-registry.ts` (BE). */
export const ALLOWED_DIMENSIONS: Record<string, string[]> = {
  cashIn: ['entity', 'project', 'client'],
  cashOut: ['entity', 'project', 'client'],
  netCash: ['entity', 'project'],
  cost: ['entity', 'project', 'client'],
  revenue: ['entity', 'project', 'client'],
  budget: ['entity', 'project', 'costType'],
  contractValue: ['entity', 'project', 'client'],
};

const DIMENSION_LABEL: Record<string, string> = {
  entity: 'Entity',
  project: 'Project',
  costType: 'Cost type',
  client: 'Client',
};

export function allowedDimensionsFor(metric: string): string[] {
  return ALLOWED_DIMENSIONS[metric] ?? ['project'];
}

export interface DecompositionBarsViewProps {
  metric: string;
  dimension: string;
  onDimensionChange: (value: string) => void;
  data?: Decomposition;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

/**
 * Zona 2 — What moved it. Menjawab "kenapa berubah" lewat kontribusi tiap
 * dimensi (bar diverging) + tabel teks yang merekonsiliasi Σ items + others.
 * Nilai dapat dibaca tanpa warna karena tabel mengulang angkanya.
 */
export function DecompositionBarsView({
  metric,
  dimension,
  onDimensionChange,
  data,
  isLoading,
  isError,
  onRetry,
}: DecompositionBarsViewProps) {
  const options = allowedDimensionsFor(metric).map((d) => ({ value: d, label: DIMENSION_LABEL[d] ?? d }));

  return (
    <section aria-label="What moved it" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-h2 text-neutral-950">What moved it</h2>
        <SegmentedControl aria-label="Dimension" options={options} value={dimension} onValueChange={onDimensionChange} />
      </div>

      {isLoading ? (
        <ChartSkeleton />
      ) : isError ? (
        <div role="alert">
          <ErrorState message="The decomposition could not be loaded." onRetry={onRetry ?? (() => {})} />
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No contributors" description="Nothing to decompose for this metric in the selected scope." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-1.5" aria-hidden="true">
            {data.items.map((item) => (
              <ContributionBar key={item.key} label={item.label} value={item.value} max={maxAbs(data)} />
            ))}
            {data.others.value !== 0 && <ContributionBar label="Others" value={data.others.value} max={maxAbs(data)} muted />}
          </div>

          <table aria-label={`Contribution by ${DIMENSION_LABEL[dimension] ?? dimension}`} className="w-full border-collapse text-left text-body-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-caption uppercase text-neutral-500">
                <th scope="col" className="py-2 font-medium">Contributor</th>
                <th scope="col" className="py-2 text-right font-medium">Value</th>
                <th scope="col" className="py-2 text-right font-medium">Share</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.key} className="border-b border-neutral-100 last:border-0">
                  <td className="py-2">
                    <DrillLink dimension={dimension} itemKey={item.key} label={item.label} />
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums text-neutral-700">{formatIdr(item.value)}</td>
                  <td className="py-2 text-right font-mono tabular-nums text-neutral-500">{(item.share * 100).toFixed(1)}%</td>
                </tr>
              ))}
              <tr className="border-t border-neutral-200 text-neutral-500">
                <td className="py-2">Others</td>
                <td className="py-2 text-right font-mono tabular-nums">{formatIdr(data.others.value)}</td>
                <td className="py-2 text-right font-mono tabular-nums">
                  {data.total !== 0 ? `${((data.others.value / data.total) * 100).toFixed(1)}%` : '—'}
                </td>
              </tr>
              <tr className="border-t border-neutral-300 font-medium text-neutral-900">
                <td className="py-2">Total</td>
                <td className="py-2 text-right font-mono tabular-nums">{formatIdr(data.total)}</td>
                <td className="py-2 text-right font-mono tabular-nums">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function maxAbs(data: Decomposition): number {
  const values = [...data.items.map((i) => Math.abs(i.value)), Math.abs(data.others.value)];
  return Math.max(1, ...values);
}

function ContributionBar({ label, value, max, muted }: { label: string; value: number; max: number; muted?: boolean }) {
  const pct = Math.min(100, (Math.abs(value) / max) * 100);
  const color = muted ? CHART.axis : value >= 0 ? CHART.positive : CHART.negative;
  return (
    <div className="flex items-center gap-2 text-caption">
      <span className="w-32 shrink-0 truncate text-neutral-600" title={label}>{label}</span>
      <span className="h-2.5 flex-1 rounded-sm bg-neutral-100">
        <span className="block h-full rounded-sm" style={{ width: `${pct}%`, backgroundColor: color }} />
      </span>
      <span className="w-28 shrink-0 text-right font-mono tabular-nums text-neutral-700">{formatIdr(value)}</span>
    </div>
  );
}

function DrillLink({ dimension, itemKey, label }: { dimension: string; itemKey: string; label: string }) {
  if (dimension === 'project') {
    return (
      <Link to="/project-health" search={{ project: itemKey } as never} className="text-neutral-800 hover:underline">
        {label}
      </Link>
    );
  }
  if (dimension === 'client') {
    return (
      <Link to="/finance/client-invoices" className="text-neutral-800 hover:underline">
        {label}
      </Link>
    );
  }
  return <span className="text-neutral-800">{label}</span>;
}

/** Zona 2 terhubung: menarik dekomposisi untuk metrik + dimensi + scope. */
export function DecompositionBars({
  metric,
  dimension,
  onDimensionChange,
  filter,
  compare,
}: {
  metric: string;
  dimension: string;
  onDimensionChange: (value: string) => void;
  filter: DashboardFilter;
  compare: boolean;
}) {
  const query = useDecomposition({ metric, dimension, compare: compare ? 'previous' : undefined }, filter);
  return (
    <DecompositionBarsView
      metric={metric}
      dimension={dimension}
      onDimensionChange={onDimensionChange}
      data={query.data}
      isLoading={query.isLoading}
      isError={query.isError}
      onRetry={() => query.refetch()}
    />
  );
}
