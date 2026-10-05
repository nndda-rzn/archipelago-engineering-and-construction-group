import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import { Badge, DeltaBadge, EmptyState, ErrorState, Skeleton, Sparkline, StatusBadge } from '@aec/ui';
import { useExecutiveDashboard, useAnomalies, type Anomaly, type ExecutiveDashboard, type TrendPoint } from '@/features/analytics';
import { usePortfolio } from '@/features/project';
import { healthMeta } from '@/widgets/portfolio-spine';
import { formatIdr } from '@/shared/lib/format';
import { TONE_CLASS, valueTone } from '@/shared/lib/value-tone';

type Delta = NonNullable<ExecutiveDashboard['delta']>[string];

/** Satu baris metrik di ledger. `trend` hanya diisi bila API punya seri nyata. */
interface MetricRow {
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

const OPERATIONAL_ORDER: Array<Anomaly['severity']> = ['HIGH', 'MEDIUM', 'LOW'];

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

function MetricRowView({ row }: { row: MetricRow }) {
  const hasSeries = row.trend != null && row.trend.some((p) => p.value !== 0);
  return (
    <Link
      to={row.to}
      data-slot="metric-row"
      className="group grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 border-b border-neutral-100 py-2 last:border-0 hover:bg-neutral-50"
    >
      <span className="flex items-center gap-1.5 text-body-sm text-neutral-700 group-hover:text-neutral-950">
        <span className="truncate">{row.label}</span>
        <ArrowUpRight className="h-3 w-3 shrink-0 text-neutral-300 group-hover:text-neutral-500" aria-hidden="true" />
      </span>

      <span data-slot="metric-spark" className="w-20 shrink-0 text-neutral-400">
        {hasSeries ? <Sparkline values={row.trend!.map((p) => p.value)} label={`${row.label} trend`} width={80} height={20} /> : null}
      </span>

      <span className="w-36 shrink-0 text-right font-mono text-body-sm tabular-nums text-neutral-900">{row.value}</span>

      <span data-slot="metric-delta" className="flex w-16 shrink-0 justify-end">
        {row.delta ? <DeltaBadge pct={row.delta.pctChange} direction={row.delta.direction} /> : <span className="text-caption text-neutral-300">—</span>}
      </span>    </Link>
  );
}

function LedgerSection({ title, rows }: { title: string; rows: MetricRow[] }) {
  return (
    <section>
      <h2 className="text-overline uppercase text-neutral-500">{title}</h2>
      <div className="mt-1">
        {rows.map((row) => (
          <MetricRowView key={row.key} row={row} />
        ))}
      </div>
    </section>
  );
}

function PortfolioHealthBar({ counts }: { counts: Record<string, number> }) {
  const segments = healthSegments(counts);
  const total = segments.reduce((s, seg) => s + seg.count, 0);
  if (total === 0) {
    return <p className="text-body-sm text-neutral-500">No projects in this scope.</p>;
  }
  return (
    <div>
      <div
        data-slot="health-bar"
        role="img"
        aria-label={segments.map((s) => `${s.count} ${s.label.toLowerCase()}`).join(', ')}
        className="flex h-2.5 overflow-hidden rounded-sm bg-neutral-100"
      >
        {segments.map((s) => (
          <div key={s.key} className={s.className} style={{ width: `${(s.count / total) * 100}%` }} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5 text-caption text-neutral-600">
            <span className={`inline-block h-2 w-2 rounded-full ${s.className}`} aria-hidden="true" />
            <span>{s.label}</span>
            <span className="font-mono tabular-nums text-neutral-500">{s.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AnomalyTriage({ anomalies, total }: { anomalies: Anomaly[]; total: number }) {
  const [filter, setFilter] = useState<Anomaly['severity'] | ''>('');
  const shown = filter ? anomalies.filter((a) => a.severity === filter) : anomalies;
  const counts = Object.fromEntries(OPERATIONAL_ORDER.map((sev) => [sev, anomalies.filter((a) => a.severity === sev).length]));

  if (total === 0) {
    return (
      <EmptyState
        tone="success"
        icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
        title="No anomalies"
        description="Nothing flagged across the portfolio."
      />
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          aria-pressed={filter === ''}
          onClick={() => setFilter('')}
          className={`rounded px-2 py-0.5 text-caption transition-colors duration-fast ${filter === '' ? 'bg-neutral-800 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
        >
          All {total}
        </button>
        {OPERATIONAL_ORDER.map((sev) => (
          <button
            key={sev}
            type="button"
            aria-pressed={filter === sev}
            onClick={() => setFilter(filter === sev ? '' : sev)}
            className={`rounded px-2 py-0.5 text-caption capitalize transition-colors duration-fast ${filter === sev ? 'bg-neutral-800 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
          >
            {sev.charAt(0) + sev.slice(1).toLowerCase()} {counts[sev] ?? 0}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="py-2 text-body-sm text-neutral-500">No anomalies at this severity.</p>
      ) : (
        <ul>
          {shown.map((a, i) => (
            <li key={`${a.type}-${i}`} className="flex items-center gap-3 border-b border-neutral-100 py-2 last:border-0">
              <StatusBadge status={a.severity} />
              <span className="font-mono text-caption text-neutral-500">{a.type}</span>
              {a.projectCode && <span className="font-mono text-caption text-neutral-500">{a.projectCode}</span>}
              <span className="min-w-0 flex-1 truncate text-body-sm text-neutral-700">{a.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LedgerSkeleton() {
  return (
    <div aria-label="Loading dashboard" className="space-y-6">
      <Skeleton className="h-20 w-full" />
      {[0, 1].map((s) => (
        <div key={s} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 border-b border-neutral-100 py-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function AnalyticsDashboardPage() {
  // `compare: 'previous'` wajib — tanpa ini API tidak mengirim `delta` sama sekali.
  const { data, isLoading, isError, refetch } = useExecutiveDashboard({}, { compare: 'previous' });
  const anomalies = useAnomalies();
  const portfolio = usePortfolio();

  if (isLoading) return <LedgerSkeleton />;
  if (isError || !data) {
    return (
      <div role="alert">
        <ErrorState message="The executive dashboard could not be loaded." onRetry={() => refetch()} />
      </div>
    );
  }

  const metricRows = buildMetricRows(data);
  const operationalRows = buildOperationalRows(data);
  const cashDelta = data.delta?.['finance.cashIn'];
  const cashTrend = (data.trend?.cashIn ?? []).map((p) => p.value);
  const healthCounts = portfolio.data?.healthCounts ?? { NO_BUDGET: 0, ON_TRACK: 0, AT_RISK: 0, CRITICAL: 0 };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header>
        <h1 className="text-h1 text-neutral-950">Executive dashboard</h1>
        <p className="mt-1 text-body-sm text-neutral-500">
          Portfolio &amp; cross-domain metrics · data per {new Date(data.generatedAt).toLocaleString('id-ID')}
        </p>
      </header>

      {/* ZONA 1 — angka juara: area terbesar, tanpa bingkai (paling penting = paling sedikit chrome). */}
      <section aria-labelledby="cash-heading" className="border-b border-neutral-200 pb-5">
        <h2 id="cash-heading" className="text-overline uppercase text-neutral-500">
          Cash position · bank balances
        </h2>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-5 gap-y-2">
          <span data-slot="cash-figure" className={`font-mono tabular-nums text-display ${TONE_CLASS[valueTone(data.finance.cashIn)]}`}>
            {formatIdr(data.finance.cashIn)}
          </span>
          {cashTrend.some((v) => v !== 0) && (
            <span className="text-neutral-400">
              <Sparkline values={cashTrend} label="Cash in trend" width={120} height={28} baseline={0} />
            </span>
          )}
          {cashDelta && <DeltaBadge pct={cashDelta.pctChange} direction={cashDelta.direction} />}
        </div>
        <p className="mt-2 text-body-sm text-neutral-500">
          Net cash flow ·{' '}
          <span className={`font-mono tabular-nums ${TONE_CLASS[valueTone(data.finance.cashIn - data.finance.cashOut)]}`}>
            {formatIdr(data.finance.cashIn - data.finance.cashOut)}
          </span>
        </p>
      </section>

      {/* ZONA 2 — ledger metrik: baris, bukan kartu. */}
      <LedgerSection title="Financial" rows={metricRows} />

      {/* ZONA 3 — operasional, exception-first. */}
      <LedgerSection title="Operational" rows={operationalRows} />

      {/* ZONA 4 — portfolio health. */}
      <section>
        <h2 className="text-overline uppercase text-neutral-500">Portfolio health</h2>
        <div className="mt-2">
          <PortfolioHealthBar counts={healthCounts} />
        </div>
      </section>

      {/* ZONA 5 — anomali dengan triage. */}
      <section className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-h2 text-neutral-950">Anomaly triage</h2>
          <Badge variant={(anomalies.data?.total ?? 0) > 0 ? 'warning' : 'success'}>{anomalies.data?.total ?? 0} anomalies</Badge>
        </div>
        {anomalies.isLoading ? (
          <div aria-label="Loading anomalies" className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : (
          <AnomalyTriage anomalies={anomalies.data?.anomalies ?? []} total={anomalies.data?.total ?? 0} />
        )}
      </section>
    </div>
  );
}
