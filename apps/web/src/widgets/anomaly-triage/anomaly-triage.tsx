import { Badge, EmptyState } from '@aec/ui';
import type { Anomaly } from '@aec/api-contracts';
import { useAnomalies } from '@/features/analytics';

export interface AnomalyGroup {
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  items: Anomaly[];
}

const ORDER: Array<'HIGH' | 'MEDIUM' | 'LOW'> = ['HIGH', 'MEDIUM', 'LOW'];
const VARIANT: Record<'HIGH' | 'MEDIUM' | 'LOW', 'destructive' | 'warning' | 'info'> = {
  HIGH: 'destructive',
  MEDIUM: 'warning',
  LOW: 'info',
};

/** Kelompokkan anomali per severity (HIGH→MEDIUM→LOW), membuang grup kosong. */
export function groupAnomalies(anomalies: Anomaly[]): AnomalyGroup[] {
  return ORDER.map((severity) => ({
    severity,
    items: anomalies.filter((a) => a.severity === severity),
  })).filter((g) => g.items.length > 0);
}

export function AnomalyTriage() {
  const { data, isLoading } = useAnomalies();
  const groups = groupAnomalies(data?.anomalies ?? []);

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-h2 text-neutral-950">Anomaly triage</h2>
        <Badge variant={groups.length > 0 ? 'warning' : 'success'}>{data?.total ?? 0} anomalies</Badge>
      </div>

      {isLoading ? (
        <p className="text-body-sm text-neutral-500">Loading…</p>
      ) : groups.length === 0 ? (
        <EmptyState title="No anomalies" description="Nothing flagged across the portfolio." />
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.severity}>
              <div className="mb-1 flex items-center gap-2">
                <Badge variant={VARIANT[g.severity]}>{g.severity}</Badge>
                <span className="text-caption text-neutral-500">{g.items.length}</span>
              </div>
              <ul className="space-y-1">
                {g.items.map((a, i) => (
                  <li key={`${a.type}-${i}`} className="flex items-center gap-3 border-b border-neutral-100 py-1.5 last:border-0">
                    <span className="font-mono text-caption text-neutral-500">{a.type}</span>
                    {a.projectCode && <span className="font-mono text-caption text-neutral-500">{a.projectCode}</span>}
                    <span className="text-body-sm text-neutral-700">{a.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
