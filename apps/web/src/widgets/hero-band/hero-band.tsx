import { StatCard } from '@aec/ui';
import { useExecutiveDashboard } from '@/features/analytics';
import { usePortfolio } from '@/features/project';
import type { DashboardFilter } from '@/shared/lib/dashboard-period';
import { formatIdr } from '@/shared/lib/format';

/** Kalimat narasi hero dari angka yang sudah dimuat (fungsi murni). */
export function heroNarrative(input: { netCash: number; criticalProjects: number; openNcrs: number }): string {
  const direction = input.netCash >= 0 ? 'positive' : 'negative';
  return `Cash net ${direction}; ${input.criticalProjects} critical project(s); ${input.openNcrs} open NCR(s).`;
}

export function HeroBand({ filter = {} }: { filter?: DashboardFilter }) {
  const executive = useExecutiveDashboard(filter);
  const portfolio = usePortfolio(filter);

  const finance = executive.data?.finance;
  const netCash = (finance?.cashIn ?? 0) - (finance?.cashOut ?? 0);
  const criticalProjects = portfolio.data?.healthCounts.CRITICAL ?? 0;
  const openNcrs = executive.data?.operational.openNcrs ?? 0;

  const totals = portfolio.data?.totals;
  const budget = totals?.totalBudget ?? 0;
  const actual = totals?.totalActual ?? 0;
  const budgetPct = budget > 0 ? Math.round((actual / budget) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-overline uppercase text-neutral-500">Net Cash Position</p>
        <p
          className={`mt-1 font-mono tabular-nums text-display ${
            netCash >= 0 ? 'text-financial-positive-600' : 'text-financial-negative-600'
          }`}
        >
          {formatIdr(netCash)}
        </p>
        <p className="mt-2 text-body text-neutral-700">{heroNarrative({ netCash, criticalProjects, openNcrs })}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Contract Value" value={formatIdr(totals?.totalContract ?? 0)} context={`${totals?.projectCount ?? 0} projects`} />
        <StatCard label="Budget" value={formatIdr(budget)} context="(baseline)" />
        <StatCard label="Actual Cost" value={formatIdr(actual)} context={`${budgetPct}% of budget`} />
      </div>
    </div>
  );
}
