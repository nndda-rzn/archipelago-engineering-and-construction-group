import { Link } from '@tanstack/react-router';
import { EmptyState, SignalChip, type SignalSeverity } from '@aec/ui';
import { useAging, useAnomalies, useExecutiveDashboard, usePendingApprovals } from '@/features/analytics';
import type { DashboardFilter } from '@/shared/lib/dashboard-period';

export interface Signal {
  key: string;
  severity: SignalSeverity;
  count: number;
  label: string;
  context?: string;
  to: string;
}

export interface SignalInput {
  openNcrs: number;
  openIncidents: number;
  overduePm: number;
  openPunchItems: number;
  openClaims: number;
  pendingApprovals: number;
  overdueAr: number;
  anomalies: { high: number; medium: number; low: number };
}

const SEVERITY_RANK: Record<SignalSeverity, number> = { high: 0, medium: 1, low: 2 };

/** Susun sinyal dari angka mentah: buang yang nol, urut severity lalu jumlah. */
export function buildSignals(input: SignalInput): Signal[] {
  const signals: Signal[] = [];

  if (input.anomalies.high > 0) {
    signals.push({ key: 'anomalies', severity: 'high', count: input.anomalies.high, label: 'Anomalies', context: 'high severity', to: '/analytics' });
  }
  if (input.openIncidents > 0) {
    signals.push({ key: 'incidents', severity: 'high', count: input.openIncidents, label: 'Incidents', context: 'open', to: '/hse?tab=incidents&status=OPEN' });
  }
  if (input.openNcrs > 0) {
    signals.push({ key: 'ncrs', severity: 'high', count: input.openNcrs, label: 'NCRs', context: 'open', to: '/quality?tab=ncrs&status=OPEN' });
  }
  if (input.anomalies.medium > 0) {
    signals.push({ key: 'anomalies-medium', severity: 'medium', count: input.anomalies.medium, label: 'Anomalies', context: 'medium severity', to: '/analytics' });
  }
  if (input.overduePm > 0) {
    signals.push({ key: 'pm', severity: 'medium', count: input.overduePm, label: 'PM overdue', context: 'equipment', to: '/hcm/equipment' });
  }
  if (input.overdueAr > 0) {
    signals.push({ key: 'overdueAr', severity: 'medium', count: input.overdueAr, label: 'AR overdue', context: '61+ days', to: '/finance/client-invoices' });
  }
  if (input.openClaims > 0) {
    signals.push({ key: 'claims', severity: 'low', count: input.openClaims, label: 'Claims DRAFT', context: 'need certification', to: '/finance/progress-claims?status=DRAFT' });
  }
  if (input.pendingApprovals > 0) {
    signals.push({ key: 'approvals', severity: 'low', count: input.pendingApprovals, label: 'Approvals', context: 'pending', to: '/approvals' });
  }
  if (input.openPunchItems > 0) {
    signals.push({ key: 'punch', severity: 'low', count: input.openPunchItems, label: 'Punch items', context: 'open', to: '/quality?tab=punch&status=OPEN' });
  }
  if (input.anomalies.low > 0) {
    signals.push({ key: 'anomalies-low', severity: 'low', count: input.anomalies.low, label: 'Anomalies', context: 'low severity', to: '/analytics' });
  }

  return signals.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.count - a.count);
}

export function SignalRailView({ signals }: { signals: Signal[] }) {
  if (signals.length === 0) {
    return <EmptyState title="All clear" description="No open signals." />;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {signals.map((s) => (
        <Link key={s.key} to={s.to} aria-label={`${s.label}: ${s.count} ${s.context ?? ''}`.trim()}>
          <SignalChip severity={s.severity} count={s.count} label={s.label} context={s.context} />
        </Link>
      ))}
    </div>
  );
}

/** Rail terhubung: membaca hook analytics dan merender sinyal. */
export function SignalRail({ filter = {} }: { filter?: DashboardFilter }) {
  const executive = useExecutiveDashboard(filter);
  const anomalies = useAnomalies();
  const aging = useAging(filter);
  const pending = usePendingApprovals();

  const op = executive.data?.operational;
  const anomalyList = anomalies.data?.anomalies ?? [];
  const countSeverity = (sev: 'HIGH' | 'MEDIUM' | 'LOW') => anomalyList.filter((a) => a.severity === sev).length;
  const overdueAr = (aging.data?.ar ?? [])
    .filter((b) => b.bucket === '61-90' || b.bucket === '90+')
    .reduce((s, b) => s + b.amount, 0);

  const signals = buildSignals({
    openNcrs: op?.openNcrs ?? 0,
    openIncidents: op?.openIncidents ?? 0,
    overduePm: op?.overduePm ?? 0,
    openPunchItems: op?.openPunchItems ?? 0,
    openClaims: op?.openClaims ?? 0,
    pendingApprovals: pending.data?.count ?? 0,
    overdueAr: overdueAr > 0 ? 1 : 0,
    anomalies: { high: countSeverity('HIGH'), medium: countSeverity('MEDIUM'), low: countSeverity('LOW') },
  });

  return <SignalRailView signals={signals} />;
}
