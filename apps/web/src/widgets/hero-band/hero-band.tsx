import { DeltaBadge, StatCard } from '@aec/ui';
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

type PortfolioItem = NonNullable<ReturnType<typeof usePortfolio>['data']>['items'][number];

/** Re-agregasi KPI dari daftar item (dipakai saat cross-filter health aktif). */
export function summarizePortfolio(items: PortfolioItem[]): {
  projectCount: number;
  totalContract: number;
  totalBudget: number;
  totalActual: number;
  criticalProjects: number;
} {
  return items.reduce(
    (acc, p) => {
      acc.projectCount += 1;
      acc.totalContract += p.contractValue;
      acc.totalBudget += p.budget;
      acc.totalActual += p.actual;
      if (p.health === 'CRITICAL') acc.criticalProjects += 1;
      return acc;
    },
    { projectCount: 0, totalContract: 0, totalBudget: 0, totalActual: 0, criticalProjects: 0 },
  );
}

export function HeroBand({ filter = {}, health = '' }: { filter?: DashboardFilter; health?: string }) {
  const executive = useExecutiveDashboard(filter, { compare: 'previous' });
  const portfolio = usePortfolio(filter);
  const cashPosition = useCashPosition();

  const cashOnHand = cashPosition.data?.totalBalance ?? 0;
  const finance = executive.data?.finance;
  const netCashFlow = (finance?.cashIn ?? 0) - (finance?.cashOut ?? 0);
  const openNcrs = executive.data?.operational.openNcrs ?? 0;

  // KPI mengikuti cross-filter health; tanpa filter, pakai agregat server.
  const items = portfolio.data?.items ?? [];
  const scoped = health ? summarizePortfolio(items.filter((p) => p.health === health)) : null;
  const totals = portfolio.data?.totals;
  const budget = scoped ? scoped.totalBudget : totals?.totalBudget ?? 0;
  const actual = scoped ? scoped.totalActual : totals?.totalActual ?? 0;
  const contract = scoped ? scoped.totalContract : totals?.totalContract ?? 0;
  const projectCount = scoped ? scoped.projectCount : totals?.projectCount ?? 0;
  const criticalProjects = scoped ? scoped.criticalProjects : portfolio.data?.healthCounts.CRITICAL ?? 0;
  const budgetPct = budget > 0 ? Math.round((actual / budget) * 100) : 0;

  const deltaBudget = executive.data?.delta?.['finance.totalBudget'];
  const deltaCashIn = executive.data?.delta?.['finance.cashIn'];

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
        <p className="mt-2 flex items-center gap-2 text-h3 text-neutral-700">
          <span>
            Net cash flow · period:{' '}
            <span className={netCashFlow >= 0 ? 'text-financial-positive-600' : 'text-financial-negative-600'}>
              {formatIdr(netCashFlow)}
            </span>
          </span>
          {deltaCashIn && <DeltaBadge pct={deltaCashIn.pctChange} direction={deltaCashIn.direction} />}
        </p>
        <p className="mt-2 text-body text-neutral-600">
          {heroNarrative({ cashOnHand, netCashFlow, criticalProjects, openNcrs })}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Contract Value" value={formatIdr(contract)} context={`${projectCount} projects`} />
        <StatCard
          label="Budget"
          value={formatIdr(budget)}
          context="(baseline)"
          delta={deltaBudget ? { value: `${deltaBudget.pctChange ?? '—'}%`, direction: deltaBudget.direction } : undefined}
        />
        <StatCard label="Actual Cost" value={formatIdr(actual)} context={`${budgetPct}% of budget`} />
      </div>
    </div>
  );
}
