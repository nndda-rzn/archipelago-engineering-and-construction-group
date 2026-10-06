import { useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { Button, EmptyState, ErrorState, Skeleton } from '@aec/ui';
import {
  useAging, useCashFlow, useProjectCostSummary, useCostComposition, useArConcentration, useForecastVsActual,
  exportAnalytics,
} from '@/features/analytics';
import { DashboardFilterBar, useDashboardFilter } from '@/widgets/dashboard-filter-bar';
import {
  AgingBucketBars, AgingDetailTable, AgingStackedBar, BudgetUsageBars, CashFlowArea,
  ConcentrationBars, CostCompositionChart, ForecastVsActualChart,
} from '@/widgets/dashboard-charts';
import { formatIdr } from '@/shared/lib/format';

const TOTAL = (rows: { amount: number }[]) => rows.reduce((s, r) => s + r.amount, 0);

/** Angka besar tanpa bingkai — satu nilai = angka, bukan chart (`ux-designer/18`). */
function Headline({ label, value, tone, context }: { label: string; value: string; tone?: string; context?: string }) {
  return (
    <div>
      <p className="text-overline uppercase text-neutral-500">{label}</p>
      <p className={`mt-0.5 font-mono tabular-nums text-h1 ${tone ?? 'text-neutral-950'}`}>{value}</p>
      {context && <p className="text-caption text-neutral-500">{context}</p>}
    </div>
  );
}

/** Panel laporan: judul + aksi export opsional. State loading/empty ditangani isinya. */
function Panel({ title, subtitle, onExport, children, ariaLabel }: { title: string; subtitle?: string; onExport?: () => Promise<void>; children: React.ReactNode; ariaLabel?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <section aria-label={ariaLabel} className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-h2 text-neutral-950">{title}</h2>
          {subtitle && <p className="mt-0.5 text-caption text-neutral-500">{subtitle}</p>}
        </div>
        {onExport && (
          <Button
            size="sm"
            variant="secondary"
            className="no-print shrink-0"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try { await onExport(); } finally { setBusy(false); }
            }}
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            {busy ? 'Preparing…' : 'CSV'}
          </Button>
        )}
      </div>
      {children}
    </section>
  );
}

function PanelState({ isLoading, isError, onRetry, empty, emptyNode, children }: {
  isLoading: boolean; isError: boolean; onRetry: () => void; empty: boolean; emptyNode?: React.ReactNode; children: React.ReactNode;
}) {
  if (isLoading) return <div aria-label="Loading report"><Skeleton className="h-32 w-full" /></div>;
  if (isError) return <ErrorState message="Could not load this report." onRetry={onRetry} />;
  if (empty) return <>{emptyNode ?? <EmptyState title="No data" description="Nothing to report for this filter." />}</>;
  return <>{children}</>;
}

export function ReportingPage() {
  const { filter } = useDashboardFilter();
  const [arBucket, setArBucket] = useState('');
  const [apBucket, setApBucket] = useState('');

  const cashFlow = useCashFlow(filter);
  const aging = useAging(filter);
  const costSummary = useProjectCostSummary(filter);
  const composition = useCostComposition(filter);
  const concentration = useArConcentration(filter);
  const forecast = useForecastVsActual(filter);

  const arTotal = TOTAL(aging.data?.ar ?? []);
  const apTotal = TOTAL(aging.data?.ap ?? []);
  const overdueAr = (aging.data?.ar ?? []).filter((b) => b.bucket !== 'CURRENT').reduce((s, b) => s + b.amount, 0);
  const overdueAp = (aging.data?.ap ?? []).filter((b) => b.bucket !== 'CURRENT').reduce((s, b) => s + b.amount, 0);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 text-neutral-950">Advanced Reporting</h1>
          <p className="mt-1 text-body-sm text-neutral-500">
            Cash flow · aging AR/AP · project cost · forecast
            {aging.data?.generatedAt ? ` · data per ${new Date(aging.data.generatedAt).toLocaleString('id-ID')}` : ''}
          </p>
        </div>
        <Button size="sm" variant="secondary" className="no-print" onClick={() => window.print()}>
          <Printer className="h-3.5 w-3.5" aria-hidden="true" />
          Print
        </Button>
      </header>

      <DashboardFilterBar queryKey={cashFlow.isFetching ? ['reporting', 'loading'] : undefined} />

      {/* ZONA 1 — posisi ringkas */}
      <section aria-label="Summary" className="grid grid-cols-2 gap-x-8 gap-y-4 border-b border-neutral-200 pb-5 sm:grid-cols-4">
        <Headline
          label="AR outstanding"
          value={formatIdr(arTotal)}
          context={overdueAr > 0 ? `${formatIdr(overdueAr)} overdue` : 'nothing overdue'}
          tone={overdueAr > 0 ? 'text-destructive-600' : undefined}
        />
        <Headline
          label="AP outstanding"
          value={formatIdr(apTotal)}
          context={overdueAp > 0 ? `${formatIdr(overdueAp)} overdue` : 'nothing overdue'}
          tone={overdueAp > 0 ? 'text-destructive-600' : undefined}
        />
        <Headline label="Net cash" value={cashFlow.data ? formatIdr(cashFlow.data.netCash) : '—'} tone={cashFlow.data && cashFlow.data.netCash < 0 ? 'text-destructive-600' : undefined} context="collections − payments" />
        <Headline label="Projects" value={costSummary.data ? String(costSummary.data.items.length) : '—'} context="in scope" />
      </section>

      {/* ZONA 2 — cash flow */}
      <Panel title="Cash flow" subtitle="Monthly cash in / out (empty months shown as zero)" onExport={() => exportAnalytics.cashFlow(filter)}>
        <PanelState
          isLoading={cashFlow.isLoading}
          isError={cashFlow.isError}
          onRetry={() => cashFlow.refetch()}
          empty={(cashFlow.data?.series.length ?? 0) === 0}
          emptyNode={<EmptyState title="No cash movement" description="No collections or payments in this period." />}
        >
          {cashFlow.data && (
            <>
              <CashFlowArea series={cashFlow.data.series} />
              <div className="mt-3 flex flex-wrap gap-6 text-body-sm text-neutral-600">
                <span>Total in <span className="font-mono tabular-nums text-success-700">{formatIdr(cashFlow.data.totalCashIn)}</span></span>
                <span>Total out <span className="font-mono tabular-nums text-destructive-600">{formatIdr(cashFlow.data.totalCashOut)}</span></span>
                <span>Net <span className={`font-mono font-medium tabular-nums ${cashFlow.data.netCash >= 0 ? 'text-success-700' : 'text-destructive-600'}`}>{formatIdr(cashFlow.data.netCash)}</span></span>
              </div>
            </>
          )}
        </PanelState>
      </Panel>

      {/* ZONA 3 — aging AR & AP */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {(['AR', 'AP'] as const).map((side) => {
          const buckets = (side === 'AR' ? aging.data?.ar : aging.data?.ap) ?? [];
          const selected = side === 'AR' ? arBucket : apBucket;
          const setSelected = side === 'AR' ? setArBucket : setApBucket;
          const total = TOTAL(buckets);
          return (
            <Panel
              key={side}
              ariaLabel={`Aging ${side}`}
              title={`Aging ${side}`}
              subtitle={`${side === 'AR' ? 'Receivable' : 'Payable'} · basis ${aging.data?.basisDate ?? 'invoice date'} · total ${formatIdr(total)}`}
              onExport={() => exportAnalytics.aging(filter)}
            >
              <PanelState
                isLoading={aging.isLoading}
                isError={aging.isError}
                onRetry={() => aging.refetch()}
                empty={total <= 0}
                emptyNode={<EmptyState title={`No outstanding ${side === 'AR' ? 'receivables' : 'payables'}`} description="Everything is settled for this filter." />}
              >
                <AgingStackedBar buckets={buckets} label={side} />
                <div className="mt-3">
                  <AgingBucketBars buckets={buckets} selected={selected} onSelect={setSelected} label={`Aging ${side}`} />
                </div>
              </PanelState>
            </Panel>
          );
        })}
      </div>

      {/* ZONA 4 — detail aging (drill-down). Selalu tampil: sebelum dipilih ia
          menjelaskan bahwa bucket bisa diklik, bukan menghilang tanpa jejak. */}
      <Panel
        ariaLabel="Aging detail"
        title={arBucket || apBucket ? `Aging detail · ${arBucket || apBucket}` : 'Aging detail'}
        subtitle="Invoices behind the selected bucket, largest outstanding first"
        onExport={arBucket || apBucket ? () => exportAnalytics.aging(filter) : undefined}
      >
        {arBucket ? (
          <AgingDetailTable buckets={aging.data?.ar ?? []} selectedBucket={arBucket} side="AR" />
        ) : apBucket ? (
          <AgingDetailTable buckets={aging.data?.ap ?? []} selectedBucket={apBucket} side="AP" />
        ) : (
          <AgingDetailTable buckets={[]} selectedBucket="" side="AR" />
        )}
      </Panel>

      {/* ZONA 5 & 7 — konsentrasi + komposisi biaya */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel title="AR concentration" subtitle="Outstanding receivables by client">
          <PanelState
            isLoading={concentration.isLoading}
            isError={concentration.isError}
            onRetry={() => concentration.refetch()}
            empty={(concentration.data?.items.length ?? 0) === 0}
          >
            {concentration.data && <ConcentrationBars data={concentration.data} />}
          </PanelState>
        </Panel>

        <Panel title="Cost composition" subtitle="Published budget by cost type">
          <PanelState
            isLoading={composition.isLoading}
            isError={composition.isError}
            onRetry={() => composition.refetch()}
            empty={(composition.data?.total ?? 0) <= 0}
            emptyNode={<EmptyState title="No published budget" description="Publish a budget to see cost composition." />}
          >
            {composition.data && <CostCompositionChart items={composition.data.items} total={composition.data.total} />}
          </PanelState>
        </Panel>
      </div>

      {/* ZONA 6 — project cost summary */}
      <Panel title="Project cost summary" subtitle="Budget used per project (margin = revenue − cost)" onExport={() => exportAnalytics.projectCostSummary(filter)}>
        <PanelState
          isLoading={costSummary.isLoading}
          isError={costSummary.isError}
          onRetry={() => costSummary.refetch()}
          empty={(costSummary.data?.items.length ?? 0) === 0}
        >
          {costSummary.data && (
            <>
              <BudgetUsageBars items={costSummary.data.items} />
              {/* `relative` wajib: <caption className="sr-only"> memakai
                  position:absolute, dan tanpa leluhur ber-position ia mengambil
                  containing block dari <body> — lolos dari `overflow-y:auto`
                  milik <main> dan menambah ~1260px ruang kosong di bawah
                  halaman. Terbukti lewat pengukuran DOM, bukan dugaan. */}
              <div className="relative mt-4 overflow-x-auto">
                <table className="w-full border-collapse text-left text-body-sm">
                  <caption className="sr-only">Project cost summary</caption>
                  <thead>
                    <tr className="border-b border-neutral-200 text-caption uppercase text-neutral-500">
                      <th scope="col" className="py-2 font-medium">Project</th>
                      <th scope="col" className="py-2 text-right font-medium">Contract</th>
                      <th scope="col" className="py-2 text-right font-medium">Budget</th>
                      <th scope="col" className="py-2 text-right font-medium">Cost</th>
                      <th scope="col" className="py-2 text-right font-medium">Revenue</th>
                      <th scope="col" className="py-2 text-right font-medium">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costSummary.data.items.map((p) => (
                      <tr key={p.projectCode} className="border-b border-neutral-100 last:border-0">
                        <td className="py-2"><span className="font-mono text-neutral-800">{p.projectCode}</span> <span className="text-neutral-500">{p.projectName}</span></td>
                        <td className="py-2 text-right font-mono tabular-nums text-neutral-700">{formatIdr(p.contractValue)}</td>
                        <td className="py-2 text-right font-mono tabular-nums text-neutral-700">{formatIdr(p.budget)}</td>
                        <td className="py-2 text-right font-mono tabular-nums text-neutral-700">{formatIdr(p.cost)}</td>
                        <td className="py-2 text-right font-mono tabular-nums text-neutral-700">{formatIdr(p.revenue)}</td>
                        <td className={`py-2 text-right font-mono tabular-nums ${p.margin >= 0 ? 'text-success-700' : 'text-destructive-600'}`}>{formatIdr(p.margin)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </PanelState>
      </Panel>

      {/* ZONA 8 — forecast vs actual */}
      <Panel title="Forecast vs actual" subtitle="Net cash: planned vs realised, per period">
        <PanelState
          isLoading={forecast.isLoading}
          isError={forecast.isError}
          onRetry={() => forecast.refetch()}
          empty={(forecast.data?.periods.length ?? 0) === 0}
          emptyNode={<EmptyState title="No cash forecast" description="Create a cash forecast to compare it against actuals." />}
        >
          {forecast.data && <ForecastVsActualChart periods={forecast.data.periods} />}
        </PanelState>
      </Panel>
    </div>
  );
}
