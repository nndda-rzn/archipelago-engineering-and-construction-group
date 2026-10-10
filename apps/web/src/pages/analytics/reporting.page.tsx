import { useState } from 'react';
import { Printer } from 'lucide-react';
import { Button, EmptyState } from '@aec/ui';
import {
  useAging, useCashFlow, useProjectCostSummary, useCostComposition, useArConcentration, useForecastVsActual,
  exportAnalytics,
} from '@/features/analytics';
import { Headline, Panel, PanelState } from '@/features/analytics/ui/report-panel';
import { ProjectCostTable } from '@/features/analytics/ui/project-cost-table';
import { AgingDetailDialog } from '@/features/analytics/ui/aging-detail-dialog';
import { DashboardFilterBar, useDashboardFilter } from '@/widgets/dashboard-filter-bar';
import {
  AgingBucketBars, CashFlowArea,
  ConcentrationBars, CostCompositionChart, ForecastVsActualChart,
} from '@/widgets/dashboard-charts';
import { formatIdr, formatIdrCompact } from '@/shared/lib/format';

const TOTAL = (rows: { amount: number }[]) => rows.reduce((s, r) => s + r.amount, 0);

export function ReportingPage() {
  const { filter } = useDashboardFilter();
  const [arBucket, setArBucket] = useState('');
  const [apBucket, setApBucket] = useState('');

  const cashFlow = useCashFlow(filter, { compare: 'previous' });
  const aging = useAging(filter, { compare: 'previous' });
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

      {/* ZONA 1 — posisi ringkas. Total netral; merah hanya pada bagian overdue. */}
      <section aria-label="Summary" className="grid grid-cols-2 gap-x-8 gap-y-4 border-b border-neutral-200 pb-5 sm:grid-cols-4">
        <Headline
          label="AR outstanding"
          value={formatIdrCompact(arTotal)}
          valueTitle={formatIdr(arTotal)}
          context={
            overdueAr > 0
              ? <span className="text-destructive-600">{formatIdrCompact(overdueAr)} overdue</span>
              : 'nothing overdue'
          }
          delta={aging.data?.delta?.ar}
        />
        <Headline
          label="AP outstanding"
          value={formatIdrCompact(apTotal)}
          valueTitle={formatIdr(apTotal)}
          context={
            overdueAp > 0
              ? <span className="text-destructive-600">{formatIdrCompact(overdueAp)} overdue</span>
              : 'nothing overdue'
          }
          delta={aging.data?.delta?.ap}
        />
        <Headline
          label="Net cash"
          value={cashFlow.data ? formatIdrCompact(cashFlow.data.netCash) : '—'}
          valueTitle={cashFlow.data ? formatIdr(cashFlow.data.netCash) : undefined}
          tone={cashFlow.data && cashFlow.data.netCash < 0 ? 'text-destructive-600' : undefined}
          context="collections − payments"
          delta={cashFlow.data?.delta?.netCash}
        />
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

      {/* ZONA 3 — aging AR & AP. Satu encoding saja (bar per bucket); stacked bar
          dihapus karena menduplikasi angka yang sama. Klik bucket membuka modal
          detail, jadi tidak ada lagi blok kosong besar di tengah halaman. */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {(['AR', 'AP'] as const).map((side) => {
          const buckets = (side === 'AR' ? aging.data?.ar : aging.data?.ap) ?? [];
          const selected = side === 'AR' ? arBucket : apBucket;
          const setSelected = side === 'AR' ? setArBucket : setApBucket;
          const total = TOTAL(buckets);
          const overdue = side === 'AR' ? aging.data?.arOverdue : aging.data?.apOverdue;
          return (
            <Panel
              key={side}
              ariaLabel={`Aging ${side}`}
              title={`Aging ${side}`}
              subtitle={`${side === 'AR' ? 'Receivable' : 'Payable'} · basis ${aging.data?.basisDate ?? 'invoice date'} · total ${formatIdrCompact(total)}`}
              onExport={() => exportAnalytics.aging(filter)}
            >
              <PanelState
                isLoading={aging.isLoading}
                isError={aging.isError}
                onRetry={() => aging.refetch()}
                empty={total <= 0}
                emptyNode={<EmptyState title={`No outstanding ${side === 'AR' ? 'receivables' : 'payables'}`} description="Everything is settled for this filter." />}
              >
                {overdue != null && overdue > 0 && (
                  <p className="mb-2 text-caption text-destructive-600">
                    <span className="font-mono tabular-nums">{formatIdrCompact(overdue)}</span> overdue · click a bucket to see the invoices
                  </p>
                )}
                <AgingBucketBars buckets={buckets} selected={selected} onSelect={setSelected} label={`Aging ${side}`} />
              </PanelState>
            </Panel>
          );
        })}
      </div>

      {/* ZONA 4 — detail aging kini modal (hanya muncul saat bucket diklik). */}
      <AgingDetailDialog
        open={!!(arBucket || apBucket)}
        bucket={arBucket || apBucket}
        buckets={arBucket ? aging.data?.ar ?? [] : aging.data?.ap ?? []}
        side={arBucket ? 'AR' : 'AP'}
        onOpenChange={(o) => {
          if (!o) {
            setArBucket('');
            setApBucket('');
          }
        }}
      />

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
          skeleton="table"
        >
          {costSummary.data && <ProjectCostTable items={costSummary.data.items} />}
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
