import { Badge, ErrorState, Skeleton, Sparkline, DeltaBadge } from '@aec/ui';
import { useExecutiveDashboard, useAnomalies } from '@/features/analytics';
import { usePortfolio } from '@/features/project';
import { buildMetricRows, buildOperationalRows } from '@/features/analytics/lib/dashboard-rows';
import {
  LedgerSection, LedgerSkeleton, PortfolioHealthBar, AnomalyTriageFilterable,
} from '@/features/analytics/ui/dashboard-ledger';
import { formatIdr } from '@/shared/lib/format';
import { TONE_CLASS, valueTone } from '@/shared/lib/value-tone';

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
          <AnomalyTriageFilterable anomalies={anomalies.data?.anomalies ?? []} total={anomalies.data?.total ?? 0} />
        )}
      </section>
    </div>
  );
}
