import type { Anomaly, ExecutiveDashboard, TrendPoint } from '@aec/api-contracts';
import { healthMeta } from '@/entities/health';
import { formatIdr } from '@/shared/lib/format';

type Delta = NonNullable<ExecutiveDashboard['delta']>[string];

/** Satu baris metrik di ledger. `trend` hanya diisi bila API punya seri nyata. */
export interface MetricRow {
  key: string;
  label: string;
  value: string;
  to: string;
  /** Seri bulanan nyata; tanpa ini tidak ada sparkline (tidak ada grafik karangan). */
  trend?: TrendPoint[];
  /** Delta vs periode lalu; `undefined` untuk metrik snapshot (mis. Overdue PM). */
  delta?: Delta;
  /** `true` untuk metrik aliran (mis. "New NCRs / mo") — label sudah menyatakannya. */
  flow?: boolean;
}

export const OPERATIONAL_ORDER: Array<Anomaly['severity']> = ['HIGH', 'MEDIUM', 'LOW'];

/** Susun baris ledger dari data executive — satu tempat, mudah diuji. */
export function buildMetricRows(data: ExecutiveDashboard): MetricRow[] {
  const t = data.trend;
  const d = data.delta ?? {};
  return [
    { key: 'projects', label: 'Total projects', value: String(data.projects.total), to: '/projects', trend: t?.newProjects, delta: d['projects.total'] },
    { key: 'contract', label: 'Contract value', value: formatIdr(data.projects.totalContractValue), to: '/commercial', delta: d['projects.totalContractValue'] },
    { key: 'budget', label: 'Budget', value: formatIdr(data.finance.totalBudget), to: '/budget', trend: t?.newBudget, delta: d['finance.totalBudget'] },
    { key: 'cashIn', label: 'Cash in', value: formatIdr(data.finance.cashIn), to: '/finance/collections', trend: t?.cashIn, delta: d['finance.cashIn'] },
    { key: 'cashOut', label: 'Cash out', value: formatIdr(data.finance.cashOut), to: '/finance/payments', trend: t?.cashOut, delta: d['finance.cashOut'] },
    { key: 'clientInv', label: 'Client invoices', value: formatIdr(data.finance.postedClientInvoice), to: '/finance/client-invoices', delta: d['finance.postedClientInvoice'] },
    { key: 'vendorInv', label: 'Vendor invoices', value: formatIdr(data.finance.postedVendorInvoice), to: '/finance/vendor-invoices', delta: d['finance.postedVendorInvoice'] },
  ];
}

/** Baris operasional — `flow: true` berarti angka = kejadian BARU per bulan, bukan stok terbuka. */
export function buildOperationalRows(data: ExecutiveDashboard): MetricRow[] {
  const t = data.trend;
  const d = data.delta ?? {};
  return [
    { key: 'claims', label: 'DRAFT claims', value: String(data.operational.openClaims), to: '/finance/progress-claims?status=DRAFT' },
    { key: 'ncrs', label: 'New NCRs / mo', value: String(data.operational.openNcrs), to: '/quality?tab=ncrs&status=OPEN', trend: t?.newNcrs, delta: d['operational.openNcrs'], flow: true },
    { key: 'incidents', label: 'New incidents / mo', value: String(data.operational.openIncidents), to: '/hse?tab=incidents&status=OPEN', trend: t?.newIncidents, flow: true },
    { key: 'pm', label: 'Overdue PM', value: String(data.operational.overduePm), to: '/hcm/equipment' },
  ];
}

/** Segmen health portofolio — dipakai bar tersegmentasi + aria-label. */
export function healthSegments(counts: Record<string, number>): Array<{ key: string; label: string; count: number; className: string }> {
  return (['ON_TRACK', 'AT_RISK', 'CRITICAL', 'NO_BUDGET'] as const)
    .map((key) => ({
      key,
      label: healthMeta[key].label,
      count: counts[key] ?? 0,
      className: healthMeta[key].dotClass,
    }))
    .filter((s) => s.count > 0);
}
