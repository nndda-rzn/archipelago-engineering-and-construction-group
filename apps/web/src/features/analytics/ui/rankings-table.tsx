import { useNavigate } from '@tanstack/react-router';
import { DataGrid, EmptyState, ErrorState, TableSkeleton } from '@aec/ui';
import type { Decomposition } from '@aec/api-contracts';
import { Money } from '@/shared/ui/money';
import { useDecomposition } from '../model/analytics.api';
import type { DashboardFilter } from '@/shared/lib/dashboard-period';

export interface RankingsTableViewProps {
  title: string;
  dimension: string;
  data?: Decomposition;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

/**
 * Zona 3 — Rankings. Tabel padat Top-N kontributor (nilai, share) dengan bar
 * horizontal sebagai encoder nilai dan drill-through per baris (fokusabel,
 * lewat `DataGrid`). Nilai dapat dibaca tanpa warna.
 */
export function RankingsTableView({ title, dimension, data, isLoading, isError, onRetry }: RankingsTableViewProps) {
  const navigate = useNavigate();

  if (isLoading) return <TableSkeleton rows={5} />;
  if (isError) {
    return (
      <div role="alert">
        <ErrorState message="The ranking could not be loaded." onRetry={onRetry ?? (() => {})} />
      </div>
    );
  }
  if (!data || data.items.length === 0) {
    return <EmptyState title="No ranking" description="No contributors for this metric in the selected scope." />;
  }

  const max = Math.max(1, ...data.items.map((i) => Math.abs(i.value)));
  const columns = [
    {
      id: 'rank',
      header: '#',
      size: 44,
      cell: ({ row }: { row: { index: number } }) => (
        <span className="font-mono tabular-nums text-neutral-400">{row.index + 1}</span>
      ),
    },
    {
      id: 'label',
      header: 'Contributor',
      size: 240,
      cell: ({ row }: { row: { original: Decomposition['items'][number] } }) => (
        <span className="block truncate" title={row.original.label}>
          {row.original.label}
        </span>
      ),
    },
    {
      id: 'bar',
      header: '',
      size: 160,
      cell: ({ row }: { row: { original: Decomposition['items'][number] } }) => (
        <span className="block h-2.5 w-full rounded-sm bg-neutral-100">
          <span
            className="block h-full rounded-sm bg-neutral-800"
            style={{ width: `${Math.min(100, (Math.abs(row.original.value) / max) * 100)}%` }}
          />
        </span>
      ),
    },
    {
      id: 'value',
      header: 'Value',
      size: 160,
      meta: { align: 'right' as const, nowrap: true },
      cell: ({ row }: { row: { original: Decomposition['items'][number] } }) => (
        <Money value={row.original.value} className="font-mono tabular-nums text-neutral-700" />
      ),
    },
    {
      id: 'share',
      header: 'Share',
      size: 90,
      meta: { align: 'right' as const, nowrap: true },
      cell: ({ row }: { row: { original: Decomposition['items'][number] } }) => (
        <span className="font-mono tabular-nums text-neutral-500">{(row.original.share * 100).toFixed(1)}%</span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-h3 text-neutral-950">{title}</h3>
      <DataGrid
        columns={columns as never}
        data={data.items}
        getRowId={(row) => row.key}
        onRowClick={(row) => {
          if (dimension === 'project') {
            navigate({ to: '/project-health', search: { project: row.original.key } as never });
          } else if (dimension === 'client') {
            navigate({ to: '/finance/client-invoices' as never });
          }
        }}
        emptyMessage="No contributors in this scope."
        hideToolbar
      />
    </div>
  );
}

/** Zona 3 terhubung: peringkat Top-N untuk metrik + dimensi + scope terpilih. */
export function RankingsTable({
  title,
  metric,
  dimension,
  filter,
  compare,
}: {
  title: string;
  metric: string;
  dimension: string;
  filter: DashboardFilter;
  compare: boolean;
}) {
  const query = useDecomposition({ metric, dimension, limit: 10, compare: compare ? 'previous' : undefined }, filter);
  return (
    <RankingsTableView
      title={title}
      dimension={dimension}
      data={query.data}
      isLoading={query.isLoading}
      isError={query.isError}
      onRetry={() => query.refetch()}
    />
  );
}
