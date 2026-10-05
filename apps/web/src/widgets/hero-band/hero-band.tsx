import { StatCard } from '@aec/ui';
import { useExecutiveDashboard } from '@/features/analytics';
import { usePortfolio } from '@/features/project';
import { useCashPosition } from '@/features/treasury';
import type { DashboardFilter } from '@/shared/lib/dashboard-period';
import { formatIdr } from '@/shared/lib/format';

/** Kalimat narasi hero dari angka yang sudah dimuat (fungsi murni). */
export function heroNarrative(input: {
  cashOnHand: number;
  netCashFlow: number;
  criticalProjects: number;
  openNcrs: number;
}): string {
  const flow = input.netCashFlow >= 0 ? 'positive' : 'negative';
  return `Cash on hand ${formatIdr(input.cashOnHand)}; net cash flow ${flow}; ${input.criticalProjects} critical project(s); ${input.openNcrs} open NCR(s).`;
}

export function HeroBand({ filter = {} }: { filter?: DashboardFilter }) {
  const executive = useExecutiveDashboard(filter);
  const portfolio = usePortfolio(filter);
  const cashPosition = useCashPosition();

  const cashOnHand = cashPosition.data?.totalBalance ?? 0;
  const finance = executive.data?.finance;
  const netCashFlow = (finance?.cashIn ?? 0) - (finance?.cashOut ?? 0);
  const criticalProjects = portfolio.data?.healthCounts.CRITICAL ?? 0;
  const openNcrs = executive.data?.operational.openNcrs ?? 0;

  const totals = portfolio.data?.totals;
  const budget = totals?.totalBudget ?? 0;
  const actual = totals?.totalActual ?? 0;
  const budgetPct = budget > 0 ? Math.round((actual / budget) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-overline uppercase text-neutral-500">Cash on hand · bank balances</p>
        <p
          className={`mt-1 font-mono tabular-nums text-display ${
            cashOnHand >= 0 ? 'text-financial-positive-600' : 'text-financial-negative-600'
          }`}
        >
          {formatIdr(cashOnHand)}
        </p>
        <p className="mt-2 text-h3 text-neutral-700">
          Net cash flow · period:{' '}
          <span className={netCashFlow >= 0 ? 'text-financial-positive-600' : 'text-financial-negative-600'}>
            {formatIdr(netCashFlow)}
          </span>
        </p>
        <p className="mt-2 text-body text-neutral-600">
          {heroNarrative({ cashOnHand, netCashFlow, criticalProjects, openNcrs })}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Contract Value" value={formatIdr(totals?.totalContract ?? 0)} context={`${totals?.projectCount ?? 0} projects`} />
        <StatCard label="Budget" value={formatIdr(budget)} context="(baseline)" />
        <StatCard label="Actual Cost" value={formatIdr(actual)} context={`${budgetPct}% of budget`} />
      </div>
    </div>
  );
}
