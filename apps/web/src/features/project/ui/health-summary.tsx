import type { ReactNode } from 'react';
import { EmptyCell, StatusBadge } from '@aec/ui';
import type { ProjectHealth } from '@aec/api-contracts';
import { formatIdr as fmt } from '@/shared/lib/format';

export type ProjectHealthLevel = ProjectHealth['health'];

export const healthLabel: Record<ProjectHealthLevel, string> = {
  NO_BUDGET: 'Belum Ada Budget',
  ON_TRACK: 'Sehat (On Track)',
  AT_RISK: 'Berisiko (At Risk)',
  CRITICAL: 'Kritis (Critical)',
};

export function getHealthBarColor(health: ProjectHealth['health']): string {
  if (health === 'ON_TRACK') return 'bg-semantic-success';
  if (health === 'AT_RISK') return 'bg-semantic-warning';
  return 'bg-destructive-600';
}

export function HealthSummary({ data }: { data: ProjectHealth }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-h2 text-neutral-950">{data.projectName}</h2>
          <p className="mt-1 text-caption text-neutral-500">
            {data.projectCode} · {data.client} · {data.legalEntityCode}
          </p>
        </div>
        <StatusBadge status={data.health} label={healthLabel[data.health]} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard label="Budget" value={fmt(data.totalBudget)} />
        <MetricCard label="Actual Cost" value={fmt(data.totalActual)} />
        <MetricCard label="Revenue" value={fmt(data.revenue)} />
        <MetricCard label="Utilisasi" value={data.utilization != null ? `${data.utilization}%` : <EmptyCell />} />
      </div>

      <div className="mt-3 flex items-center gap-4 text-caption text-neutral-500">
        <span>
          Variance:{' '}
          <span className={data.variance >= 0 ? 'font-medium text-semantic-success' : 'font-medium text-destructive-600'}>
            {fmt(data.variance)}
          </span>
        </span>
        <span>Kontrak: {fmt(data.contractValue)}</span>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md border border-neutral-100 p-3">
      <p className="text-caption uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 font-mono tabular-nums text-h3 text-neutral-800">{value}</p>
    </div>
  );
}
