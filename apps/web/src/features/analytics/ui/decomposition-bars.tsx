import { Link } from '@tanstack/react-router';
import { EmptyState, ErrorState, ScaleBar, SegmentedControl, ChartSkeleton, type ScaleTone } from '@aec/ui';
import type { Decomposition } from '@aec/api-contracts';
import { Money } from '@/shared/ui/money';
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

/** Nada mengikuti tanda kontribusi: positif menambah, negatif mengurangi. */
function signTone(value: number): ScaleTone {
  return value >= 0 ? 'positive' : 'negative';
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
 * Zona 2 — What moved it. Menjawab "kenapa berubah" lewat kontribusi tiap dimensi.
 *
 * Satu tabel saja (bukan daftar bar terpisah + tabel): setiap baris memuat bar
 * gradient in-cell sebagai encoder visual (panjang = besaran, gradient = posisi
 * pada skala, nada = arah kontribusi), teks yang dapat dibaca tanpa warna, dan
 * drill-through. Tabel merekonsiliasi Σ items + others = total.
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
  const max = data ? Math.max(1, ...data.items.map((i) => Math.abs(i.value)), Math.abs(data.others.value)) : 1;

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
        <div className="min-w-0 overflow-x-auto">
          <table aria-label={`Contribution by ${DIMENSION_LABEL[dimension] ?? dimension}`} className="w-full border-collapse text-left text-body-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-caption uppercase text-neutral-500">
                <th scope="col" className="py-2 font-medium">Contributor</th>
                <th scope="col" className="w-1/3 py-2 font-medium">Contribution</th>
                <th scope="col" className="py-2 text-right font-medium">Share</th>
                <th scope="col" className="py-2 text-right font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.key} className="border-b border-neutral-100 last:border-0">
                  <td className="max-w-0 py-2 pr-3">
                    <DrillLink dimension={dimension} itemKey={item.key} label={item.label} />
                  </td>
                  <td className="py-2 pr-3">
                    <ScaleBar value={Math.abs(item.value)} max={max} label={item.label} tone={signTone(item.value)} />
                  </td>
                  <td className="whitespace-nowrap py-2 text-right font-mono tabular-nums text-neutral-500">
                    {(item.share * 100).toFixed(1)}%
                  </td>
                  <td className="whitespace-nowrap py-2 text-right font-mono tabular-nums">
                    <Money
                      value={item.value}
                      className={item.value >= 0 ? 'text-success-700' : 'text-destructive-600'}
                    />
                  </td>
                </tr>
              ))}
              <tr className="border-t border-neutral-200 text-neutral-500">
                <td className="py-2">Others</td>
                <td className="py-2 pr-3">
                  <ScaleBar value={Math.abs(data.others.value)} max={max} label="Others" tone="neutral" />
                </td>
                <td className="whitespace-nowrap py-2 text-right font-mono tabular-nums">
                  {data.total !== 0 ? `${((data.others.value / data.total) * 100).toFixed(1)}%` : '—'}
                </td>
                <td className="whitespace-nowrap py-2 text-right font-mono tabular-nums">
                  <Money value={data.others.value} />
                </td>
              </tr>
              <tr className="border-t border-neutral-300 font-medium text-neutral-900">
                <td className="py-2">Total</td>
                <td className="py-2 pr-3" />
                <td className="whitespace-nowrap py-2 text-right font-mono tabular-nums">100%</td>
                <td className="whitespace-nowrap py-2 text-right font-mono tabular-nums">
                  <Money value={data.total} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function DrillLink({ dimension, itemKey, label }: { dimension: string; itemKey: string; label: string }) {
  const className = 'block truncate text-neutral-800 hover:underline';
  if (dimension === 'project') {
    return (
      <Link to="/project-health" search={{ project: itemKey } as never} className={className} title={label}>
        {label}
      </Link>
    );
  }
  if (dimension === 'client') {
    return (
      <Link to="/finance/client-invoices" className={className} title={label}>
        {label}
      </Link>
    );
  }
  return <span className={className} title={label}>{label}</span>;
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
