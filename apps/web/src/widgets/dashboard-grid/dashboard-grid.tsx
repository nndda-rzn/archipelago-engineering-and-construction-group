import type { Portfolio } from '@aec/api-contracts';
import { formatIdr } from '@/shared/lib/format';

export type HealthKey = Portfolio['items'][number]['health'];
export type PortfolioTotals = Portfolio['totals'];

export const healthMeta: Record<HealthKey, { label: string; dotClass?: string; badgeVariant: 'default' | 'success' | 'warning' }> = {
  NO_BUDGET: { label: 'Belum Budget', badgeVariant: 'default' },
  ON_TRACK: { label: 'On Track', dotClass: 'bg-project-on-track-500', badgeVariant: 'success' },
  AT_RISK: { label: 'At Risk', dotClass: 'bg-project-at-risk-500', badgeVariant: 'warning' },
  CRITICAL: { label: 'Kritis', dotClass: 'bg-project-critical-500', badgeVariant: 'warning' },
};

export interface KpiItem {
  label: string;
  value: string;
}

export function KpiCard({ label, value }: KpiItem) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <p className="text-caption text-neutral-500">{label}</p>
      <p className="mt-1 font-mono text-h1 tabular-nums text-neutral-950">{value}</p>
    </div>
  );
}

export function HealthCount({ label, count, dotClass }: { label: string; count: number; dotClass?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-neutral-100 p-3">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${dotClass ?? 'bg-neutral-300'}`} aria-hidden="true" />
      <div>
        <p className="font-mono text-h3 tabular-nums text-neutral-800">{count}</p>
        <p className="text-caption text-neutral-500">{label}</p>
      </div>
    </div>
  );
}

export function DashboardGrid({
  totals,
  healthCounts,
  projectCount,
}: {
  totals: PortfolioTotals;
  healthCounts: Record<HealthKey, number>;
  projectCount: number;
}) {
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Kontrak" value={formatIdr(totals.totalContract)} />
        <KpiCard label="Budget" value={formatIdr(totals.totalBudget)} />
        <KpiCard label="Actual Cost" value={formatIdr(totals.totalActual)} />
        <KpiCard label="Revenue" value={formatIdr(totals.totalRevenue)} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-5">
        <KpiCard label="Project" value={String(projectCount)} />
        <HealthCount label={healthMeta.ON_TRACK.label} count={healthCounts.ON_TRACK} dotClass={healthMeta.ON_TRACK.dotClass} />
        <HealthCount label={healthMeta.AT_RISK.label} count={healthCounts.AT_RISK} dotClass={healthMeta.AT_RISK.dotClass} />
        <HealthCount label={healthMeta.CRITICAL.label} count={healthCounts.CRITICAL} dotClass={healthMeta.CRITICAL.dotClass} />
        <HealthCount label={healthMeta.NO_BUDGET.label} count={healthCounts.NO_BUDGET} />
      </div>
    </div>
  );
}
