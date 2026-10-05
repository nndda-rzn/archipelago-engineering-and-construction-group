import { ChartSkeleton } from '@aec/ui';
import type { AgingBucket, CashFlow } from '@aec/api-contracts';
import { useAging, useCashFlow } from '@/features/analytics';
import { usePortfolio } from '@/features/project';
import type { DashboardFilter } from '@/shared/lib/dashboard-period';
import { formatIdr } from '@/shared/lib/format';
import { AgingStackedBar, BudgetBullet, CashFlowChart } from '@/widgets/dashboard-charts';

/** Petakan bucket aging menjadi segmen berlabel, mempertahankan urutan. */
export function agingSegments(buckets: AgingBucket[]): { label: string; value: number }[] {
  return buckets.map((b) => ({ label: b.bucket, value: b.amount }));
}

/** Apakah ada saldo tersisa di bucket mana pun. */
export function hasOutstanding(buckets: AgingBucket[]): boolean {
  return buckets.some((b) => b.amount > 0);
}

function total(buckets: AgingBucket[]): number {
  return buckets.reduce((s, b) => s + b.amount, 0);
}

export interface FinancialBandViewProps {
  cashFlow: CashFlow | null;
  ar: AgingBucket[];
  ap: AgingBucket[];
  budget: number;
  actual: number;
  bucket?: string;
  onSelectBucket?: (b: string) => void;
  isLoading?: boolean;
}

/** Presentational financial band: cash flow + aging AR/AP + budget burn. */
export function FinancialBandView({
  cashFlow,
  ar,
  ap,
  budget,
  actual,
  bucket = '',
  onSelectBucket,
  isLoading = false,
}: FinancialBandViewProps) {
  const bucketButtons = (buckets: AgingBucket[], side: string) => (
    <div className="mt-2 flex flex-wrap gap-1">
      {buckets.map((b) => (
        <button
          key={`${side}-${b.bucket}`}
          type="button"
          aria-pressed={bucket === b.bucket}
          disabled={b.amount <= 0}
          onClick={() => onSelectBucket?.(bucket === b.bucket ? '' : b.bucket)}
          className={`rounded px-1.5 py-0.5 font-mono text-caption tabular-nums transition-colors duration-fast disabled:opacity-40 ${
            bucket === b.bucket ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:bg-neutral-100'
          }`}
        >
          {b.bucket}
        </button>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div aria-label="Loading financial band" className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
            <div className="mb-3 h-4 w-32 rounded bg-neutral-100" />
            <ChartSkeleton />
          </div>
        </div>
        <div className="xl:col-span-5">
          <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
            <div className="mb-3 h-4 w-32 rounded bg-neutral-100" />
            <ChartSkeleton bars={6} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-slot="financial-grid" className="grid gap-6 xl:grid-cols-12">
      <div data-slot="financial-cashflow" className="xl:col-span-7">
        <section data-slot="panel" className="h-full rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
          <h2 className="mb-3 text-h2 text-neutral-950">Cash Flow</h2>
          {cashFlow ? (
            <>
              <CashFlowChart data={cashFlow.series} />
              <div className="mt-3 flex flex-wrap gap-6 text-body-sm text-neutral-600">
                <span>Total In: <span className="font-mono text-success-700">{formatIdr(cashFlow.totalCashIn)}</span></span>
                <span>Total Out: <span className="font-mono text-destructive-600">{formatIdr(cashFlow.totalCashOut)}</span></span>
                <span>Net: <span className={`font-mono font-medium ${cashFlow.netCash >= 0 ? 'text-success-700' : 'text-destructive-600'}`}>{formatIdr(cashFlow.netCash)}</span></span>
              </div>
            </>
          ) : (
            <ChartSkeleton />
          )}
        </section>
      </div>

      <div data-slot="financial-side" className="xl:col-span-5">
        <section data-slot="panel" className="flex h-full flex-col gap-5 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
          <div>
            <h2 className="mb-3 text-h2 text-neutral-950">Aging AR / AP</h2>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-caption text-neutral-500">Receivable · {formatIdr(total(ar))}</p>
                {hasOutstanding(ar) ? (
                  <AgingStackedBar buckets={ar} label="AR" />
                ) : (
                  <p className="text-body-sm text-neutral-500">No outstanding receivables.</p>
                )}
                {bucketButtons(ar, 'ar')}
              </div>
              <div>
                <p className="mb-2 text-caption text-neutral-500">Payable · {formatIdr(total(ap))}</p>
                {hasOutstanding(ap) ? (
                  <AgingStackedBar buckets={ap} label="AP" />
                ) : (
                  <p className="text-body-sm text-neutral-500">No outstanding payables.</p>
                )}
                {bucketButtons(ap, 'ap')}
              </div>
            </div>
          </div>

          <div className="mt-auto border-t border-neutral-200 pt-4">
            <h2 className="mb-3 text-h2 text-neutral-950">Budget Burn</h2>
            <BudgetBullet actual={actual} budget={budget} />
          </div>
        </section>
      </div>
    </div>
  );
}

export function FinancialBand({ filter = {}, bucket = '', onSelectBucket }: { filter?: DashboardFilter; bucket?: string; onSelectBucket?: (b: string) => void }) {
  const cashFlow = useCashFlow(filter);
  const aging = useAging(filter);
  const portfolio = usePortfolio(filter);

  const totals = portfolio.data?.totals;
  const budget = totals?.totalBudget ?? 0;
  const actual = totals?.totalActual ?? 0;

  const isLoading = cashFlow.isLoading || aging.isLoading || portfolio.isLoading;

  return (
    <FinancialBandView
      cashFlow={cashFlow.data ?? null}
      ar={aging.data?.ar ?? []}
      ap={aging.data?.ap ?? []}
      budget={budget}
      actual={actual}
      bucket={bucket}
      onSelectBucket={onSelectBucket}
      isLoading={isLoading}
    />
  );
}
