import { BulletBar } from '@aec/ui';
import type { AgingBucket } from '@aec/api-contracts';
import { useAging, useCashFlow } from '@/features/analytics';
import { usePortfolio } from '@/features/project';
import type { DashboardFilter } from '@/shared/lib/dashboard-period';
import { formatIdr } from '@/shared/lib/format';
import { AgingBar, CashFlowChart } from '@/widgets/dashboard-charts';

/** Petakan bucket aging menjadi segmen berlabel, mempertahankan urutan. */
export function agingSegments(buckets: AgingBucket[]): { label: string; value: number }[] {
  return buckets.map((b) => ({ label: b.bucket, value: b.amount }));
}

function total(buckets: AgingBucket[]): number {
  return buckets.reduce((s, b) => s + b.amount, 0);
}

export function FinancialBand({ filter = {} }: { filter?: DashboardFilter }) {
  const cashFlow = useCashFlow(filter);
  const aging = useAging(filter);
  const portfolio = usePortfolio(filter);

  const totals = portfolio.data?.totals;
  const budget = totals?.totalBudget ?? 0;
  const actual = totals?.totalActual ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
        <h2 className="mb-3 text-h2 text-neutral-950">Cash Flow</h2>
        {cashFlow.data ? (
          <>
            <CashFlowChart data={cashFlow.data.series} />
            <div className="mt-3 flex flex-wrap gap-6 text-body-sm text-neutral-600">
              <span>Total In: <span className="font-mono text-success-700">{formatIdr(cashFlow.data.totalCashIn)}</span></span>
              <span>Total Out: <span className="font-mono text-destructive-600">{formatIdr(cashFlow.data.totalCashOut)}</span></span>
              <span>Net: <span className={`font-mono font-medium ${cashFlow.data.netCash >= 0 ? 'text-success-700' : 'text-destructive-600'}`}>{formatIdr(cashFlow.data.netCash)}</span></span>
            </div>
          </>
        ) : (
          <p className="text-body-sm text-neutral-500">Loading…</p>
        )}
      </div>

      <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
        <h2 className="mb-3 text-h2 text-neutral-950">Aging AR / AP</h2>
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-caption text-neutral-500">Receivable · {formatIdr(total(aging.data?.ar ?? []))}</p>
            <AgingBar buckets={agingSegments(aging.data?.ar ?? [])} label="AR" />
          </div>
          <div>
            <p className="mb-1 text-caption text-neutral-500">Payable · {formatIdr(total(aging.data?.ap ?? []))}</p>
            <AgingBar buckets={agingSegments(aging.data?.ap ?? [])} label="AP" />
          </div>
        </div>
      </div>

      <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
        <h2 className="mb-3 text-h2 text-neutral-950">Budget Burn</h2>
        <BulletBar value={actual} max={budget} label="Budget burn" />
        <p className="mt-2 text-caption text-neutral-500">
          {formatIdr(actual)} of {formatIdr(budget)} baseline
        </p>
      </div>
    </div>
  );
}
