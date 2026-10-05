import { Link } from '@tanstack/react-router';
import { EmptyState, SignalChip, type SignalSeverity } from '@aec/ui';
import { useSignals } from '@/features/analytics';
import type { DashboardFilter } from '@/shared/lib/dashboard-period';

export interface Signal {
  key: string;
  severity: SignalSeverity;
  count: number;
  label: string;
  context?: string;
  ageDays: number;
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
    signals.push({ key: 'anomalies', severity: 'high', count: input.anomalies.high, label: 'Anomalies', context: 'high severity', ageDays: 0, to: '/analytics' });
  }
  if (input.openIncidents > 0) {
    signals.push({ key: 'incidents', severity: 'high', count: input.openIncidents, label: 'Incidents', context: 'open', ageDays: 0, to: '/hse?tab=incidents&status=OPEN' });
  }
  if (input.openNcrs > 0) {
    signals.push({ key: 'ncrs', severity: 'high', count: input.openNcrs, label: 'NCRs', context: 'open', ageDays: 0, to: '/quality?tab=ncrs&status=OPEN' });
  }
  if (input.anomalies.medium > 0) {
    signals.push({ key: 'anomalies-medium', severity: 'medium', count: input.anomalies.medium, label: 'Anomalies', context: 'medium severity', ageDays: 0, to: '/analytics' });
  }
  if (input.overduePm > 0) {
    signals.push({ key: 'pm', severity: 'medium', count: input.overduePm, label: 'PM overdue', context: 'equipment', ageDays: 0, to: '/hcm/equipment' });
  }
  if (input.overdueAr > 0) {
    signals.push({ key: 'overdueAr', severity: 'medium', count: input.overdueAr, label: 'AR overdue', context: '61+ days', ageDays: 0, to: '/finance/client-invoices' });
  }
  if (input.openClaims > 0) {
    signals.push({ key: 'claims', severity: 'low', count: input.openClaims, label: 'Claims DRAFT', context: 'need certification', ageDays: 0, to: '/finance/progress-claims?status=DRAFT' });
  }
  if (input.pendingApprovals > 0) {
    signals.push({ key: 'approvals', severity: 'low', count: input.pendingApprovals, label: 'Approvals', context: 'pending', ageDays: 0, to: '/approvals' });
  }
  if (input.openPunchItems > 0) {
    signals.push({ key: 'punch', severity: 'low', count: input.openPunchItems, label: 'Punch items', context: 'open', ageDays: 0, to: '/quality?tab=punch&status=OPEN' });
  }
  if (input.anomalies.low > 0) {
    signals.push({ key: 'anomalies-low', severity: 'low', count: input.anomalies.low, label: 'Anomalies', context: 'low severity', ageDays: 0, to: '/analytics' });
  }

  return signals.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.ageDays - a.ageDays || b.count - a.count);
}

export function SignalRailView({ signals }: { signals: Signal[] }) {
  if (signals.length === 0) {
    return <EmptyState title="All clear" description="No open signals." />;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {signals.map((s) => {
        const context = s.ageDays > 0 ? `${s.context ?? ''} · ${s.ageDays}d`.trim() : s.context;
        return (
          <Link key={s.key} to={s.to} aria-label={`${s.label}: ${s.count} ${context ?? ''}`.trim()}>
            <SignalChip severity={s.severity} count={s.count} label={s.label} context={context} />
          </Link>
        );
      })}
    </div>
  );
}

/** Petakan sinyal API (severity UPPER, oldestAgeDays) ke bentuk widget. */
export function toSignals(apiSignals: { key: string; severity: 'HIGH' | 'MEDIUM' | 'LOW'; count: number; label: string; oldestAgeDays: number; to: string }[]): Signal[] {
  const map: Record<'HIGH' | 'MEDIUM' | 'LOW', SignalSeverity> = { HIGH: 'high', MEDIUM: 'medium', LOW: 'low' };
  return apiSignals.map((s) => ({
    key: s.key,
    severity: map[s.severity],
    count: s.count,
    label: s.label,
    context: undefined,
    ageDays: s.oldestAgeDays,
    to: s.to,
  }));
}

/** Rail terhubung: membaca endpoint signals dan merender sinyal. */
export function SignalRail({ filter = {} }: { filter?: DashboardFilter }) {
  const signals = useSignals(filter);
  return <SignalRailView signals={toSignals(signals.data?.signals ?? [])} />;
}
