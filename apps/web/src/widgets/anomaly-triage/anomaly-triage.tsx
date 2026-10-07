import { ShieldCheck } from 'lucide-react';
import { Badge, Collapsible, CollapsibleContent, CollapsibleTrigger, EmptyState, ListSkeleton } from '@aec/ui';
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

/** HIGH selalu terbuka, tetapi dibatasi agar dashboard tidak memanjang; sisanya "+N lagi". */
const HIGH_LIMIT = 8;

/** Kelompokkan anomali per severity (HIGH→MEDIUM→LOW), membuang grup kosong. */
export function groupAnomalies(anomalies: Anomaly[]): AnomalyGroup[] {
  return ORDER.map((severity) => ({
    severity,
    items: anomalies.filter((a) => a.severity === severity),
  })).filter((g) => g.items.length > 0);
}

/** Satu baris anomali: type + projectCode (mono) + pesan. */
function AnomalyRow({ anomaly }: { anomaly: Anomaly }) {
  return (
    <li className="flex items-center gap-3 border-b border-neutral-100 py-1.5 last:border-0">
      <span className="font-mono text-caption text-neutral-500">{anomaly.type}</span>
      {anomaly.projectCode && <span className="font-mono text-caption text-neutral-500">{anomaly.projectCode}</span>}
      <span className="min-w-0 truncate text-body-sm text-neutral-700" title={anomaly.message}>
        {anomaly.message}
      </span>
    </li>
  );
}

export function AnomalyTriageView({ anomalies, total, isLoading = false }: { anomalies: Anomaly[]; total?: number; isLoading?: boolean }) {
  const groups = groupAnomalies(anomalies);
  const count = total ?? anomalies.length;

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-h2 text-neutral-950">Anomaly triage</h2>
        <Badge variant={groups.length > 0 ? 'warning' : 'success'}>{count} anomalies</Badge>
      </div>

      {isLoading ? (
        <div aria-label="Loading anomalies">
          <ListSkeleton rows={3} />
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          tone="success"
          icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
          title="No anomalies"
          description="Nothing flagged across the portfolio."
        />
      ) : (
        <div className="space-y-3">
          {groups.map((g) => {
            // HIGH selalu terbuka (top-N); MEDIUM/LOW terlipat agar halaman tidak
            // memanjang saat anomali bertambah (progressive disclosure).
            const isHigh = g.severity === 'HIGH';
            const shown = isHigh ? g.items.slice(0, HIGH_LIMIT) : g.items;
            const hidden = g.items.length - shown.length;

            if (isHigh) {
              return (
                <div key={g.severity}>
                  <div className="mb-1 flex items-center gap-2">
                    <Badge variant={VARIANT[g.severity]}>{g.severity}</Badge>
                    <span className="text-caption text-neutral-500">{g.items.length}</span>
                  </div>
                  <ul>
                    {shown.map((a, i) => (
                      <AnomalyRow key={`${a.type}-${i}`} anomaly={a} />
                    ))}
                  </ul>
                  {hidden > 0 && (
                    <p className="pt-1 text-caption text-neutral-500">+{hidden} more high-severity anomalies</p>
                  )}
                </div>
              );
            }

            return (
              <Collapsible key={g.severity}>
                <CollapsibleTrigger className="flex w-full items-center gap-2 rounded px-1 py-1 text-left transition-colors duration-fast hover:bg-neutral-50">
                  <span aria-hidden="true" className="text-neutral-400">
                    ▸
                  </span>
                  <Badge variant={VARIANT[g.severity]}>{g.severity}</Badge>
                  <span className="text-caption text-neutral-500">{g.items.length}</span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul className="mt-1">
                    {shown.map((a, i) => (
                      <AnomalyRow key={`${a.type}-${i}`} anomaly={a} />
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function AnomalyTriage() {
  const { data, isLoading } = useAnomalies();
  return <AnomalyTriageView anomalies={data?.anomalies ?? []} total={data?.total} isLoading={isLoading} />;
}
