import { createColumnHelper } from '@tanstack/react-table';
import { useNavigate } from '@tanstack/react-router';
import { Badge, BulletBar, DataGrid, MiniStackedBar } from '@aec/ui';
import type { Portfolio } from '@aec/api-contracts';
import { usePortfolio, usePortfolioEvm } from '@/features/project';
import type { DashboardFilter } from '@/shared/lib/dashboard-period';
import { formatIdr } from '@/shared/lib/format';

export type HealthKey = Portfolio['items'][number]['health'];

/** Metadata tampilan per health — sumber tunggal untuk label, dot, dan varian badge. */
export const healthMeta: Record<HealthKey, { label: string; dotClass: string; badgeVariant: 'default' | 'success' | 'warning' }> = {
  NO_BUDGET: { label: 'No Budget', dotClass: 'bg-neutral-400', badgeVariant: 'default' },
  ON_TRACK: { label: 'On Track', dotClass: 'bg-project-on-track-500', badgeVariant: 'success' },
  AT_RISK: { label: 'At Risk', dotClass: 'bg-project-at-risk-500', badgeVariant: 'warning' },
  CRITICAL: { label: 'Critical', dotClass: 'bg-project-critical-500', badgeVariant: 'warning' },
};

type PortfolioItem = Portfolio['items'][number];

/** Baris spine = item portofolio + data EVM (opsional, dari rollup). */
export interface PortfolioRow extends PortfolioItem {
  evm?: { hasEvm: boolean; cpi: number | null; spi: number | null };
}

const helper = createColumnHelper<PortfolioRow>();

export const portfolioColumns = [
  helper.accessor('projectCode', {
    header: 'Project',
    cell: (info) => {
      const p = info.row.original;
      return (
        <span>
          <span className="font-mono text-neutral-600">{p.projectCode}</span>
          <span className="ml-2 text-neutral-800">{p.projectName}</span>
        </span>
      );
    },
  }),
  helper.accessor('client', {
    header: 'Client',
    cell: (info) => <span className="text-neutral-600">{info.getValue()}</span>,
  }),
  helper.accessor('health', {
    id: 'health',
    header: 'Health',
    cell: (info) => {
      const meta = healthMeta[info.getValue()];
      return (
        <Badge variant={meta.badgeVariant} className="gap-1.5">
          <span className={`inline-block h-2 w-2 rounded-full ${meta.dotClass}`} aria-hidden="true" />
          {meta.label}
        </Badge>
      );
    },
  }),
  helper.display({
    id: 'utilization',
    header: 'Utilization',
    cell: (info) => (
      <div className="w-32">
        <BulletBar value={info.row.original.utilization ?? 0} max={100} label="Utilization" />
      </div>
    ),
  }),
  helper.display({
    id: 'budgetVsActual',
    header: 'Budget vs Actual',
    cell: (info) => {
      const p = info.row.original;
      return (
        <div className="w-32">
          <MiniStackedBar primary={p.actual} secondary={Math.max(0, p.budget - p.actual)} label="Budget vs Actual" />
        </div>
      );
    },
  }),
  helper.accessor('variance', {
    id: 'variance',
    header: 'Variance',
    cell: (info) => {
      const v = info.getValue();
      return (
        <span className={`font-mono tabular-nums ${v >= 0 ? 'text-success-700' : 'text-destructive-600'}`}>
          {formatIdr(v)}
        </span>
      );
    },
  }),
  helper.accessor('revenue', {
    id: 'revenue',
    header: 'Revenue',
    cell: (info) => <span className="font-mono tabular-nums text-neutral-700">{formatIdr(info.getValue())}</span>,
  }),
  helper.display({
    id: 'margin',
    header: 'Margin',
    cell: (info) => {
      const p = info.row.original;
      const margin = p.revenue > 0 ? ((p.revenue - p.actual) / p.revenue) * 100 : 0;
      return (
        <span className={`font-mono tabular-nums ${margin >= 0 ? 'text-success-700' : 'text-destructive-600'}`}>
          {p.revenue > 0 ? `${Math.round(margin * 10) / 10}%` : '—'}
        </span>
      );
    },
  }),
  helper.display({
    id: 'evm',
    header: 'CPI / SPI',
    cell: (info) => {
      const evm = info.row.original.evm;
      if (!evm || !evm.hasEvm || evm.cpi == null || evm.spi == null) {
        return <span className="font-mono text-caption text-neutral-400">—</span>;
      }
      const cls = (v: number) => (v >= 1 ? 'text-success-700' : 'text-destructive-600');
      return (
        <span className="font-mono text-caption tabular-nums">
          <span className={cls(evm.cpi)}>{evm.cpi.toFixed(2)}</span>
          <span className="text-neutral-300"> · </span>
          <span className={cls(evm.spi)}>{evm.spi.toFixed(2)}</span>
        </span>
      );
    },
  }),
];

export function PortfolioSpine({ filter = {} }: { filter?: DashboardFilter }) {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = usePortfolio(filter);
  const evm = usePortfolioEvm(filter);

  const evmById = new Map((evm.data?.items ?? []).map((e) => [e.projectId, e]));
  const rows: PortfolioRow[] = (data?.items ?? []).map((p) => {
    const e = evmById.get(p.projectId);
    return {
      ...p,
      evm: e ? { hasEvm: e.hasEvm, cpi: e.cpi, spi: e.spi } : undefined,
    };
  });

  return (
    <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
      <DataGrid
        columns={portfolioColumns}
        data={rows}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        onRowClick={(row) => navigate({ to: '/project-health', search: { project: row.original.projectId } as never })}
        getRowId={(row) => row.projectId}
        emptyMessage="No projects yet"
      />
    </div>
  );
}
