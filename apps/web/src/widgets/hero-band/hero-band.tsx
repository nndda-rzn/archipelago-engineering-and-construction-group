import { DeltaBadge, Skeleton, Sparkline } from '@aec/ui';
import { useCashFlow, useExecutiveDashboard } from '@/features/analytics';
import { usePortfolio } from '@/features/project';
import { useCashPosition } from '@/features/treasury';
import type { DashboardFilter } from '@/shared/lib/dashboard-period';
import { formatIdr } from '@/shared/lib/format';
import { TONE_CLASS, valueTone } from '@/shared/lib/value-tone';
import { CapitalStructureChart } from '@/widgets/capital-structure';

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

export interface HeroBandViewProps {
  cashOnHand: number;
  netCashFlow: number;
  criticalProjects: number;
  openNcrs: number;
  contract: number;
  budget: number;
  actual: number;
  projectCount: number;
  deltaCashIn?: { pctChange: number | null; direction: 'up' | 'down' | 'flat' };
  /** Tren kas (mis. net per bulan) — sparkline opsional di samping angka juara. */
  cashSeries?: number[];
  isLoading?: boolean;
}

/** Presentational hero: satu angka juara (Cash on hand) + narasi + bagan capital structure. */
export function HeroBandView({
  cashOnHand,
  netCashFlow,
  criticalProjects,
  openNcrs,
  contract,
  budget,
  actual,
  projectCount,
  deltaCashIn,
  cashSeries,
  isLoading = false,
}: HeroBandViewProps) {
  if (isLoading) {
    return (
      <div aria-label="Loading hero" className="flex h-full flex-col gap-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
        <div>
          <Skeleton className="h-3 w-48" />
          <Skeleton className="mt-2 h-10 w-64" />
          <Skeleton className="mt-3 h-5 w-80" />
        </div>
        <div className="mt-auto grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-7 w-36" />
              <Skeleton className="mt-2 h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div data-slot="panel" className="flex h-full flex-col gap-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div>
        <p className="text-overline uppercase text-neutral-500">Cash on hand · bank balances</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
          <p data-slot="cash-on-hand" className={`font-mono tabular-nums text-display ${TONE_CLASS[valueTone(cashOnHand)]}`}>
            {formatIdr(cashOnHand)}
          </p>
          {cashSeries && cashSeries.length > 1 && (
            <span data-slot="cash-sparkline" className="text-neutral-400">
              <Sparkline values={cashSeries} label="Cash trend" />
            </span>
          )}
        </div>
        <p className="mt-2 flex items-center gap-2 text-h3 text-neutral-700">
          <span>
            Net cash flow · period:{' '}
            <span className={`font-mono tabular-nums ${TONE_CLASS[valueTone(netCashFlow)]}`}>{formatIdr(netCashFlow)}</span>
          </span>
          {deltaCashIn && <DeltaBadge pct={deltaCashIn.pctChange} direction={deltaCashIn.direction} />}
        </p>
        <p className="mt-2 text-body text-neutral-600">
          {heroNarrative({ cashOnHand, netCashFlow, criticalProjects, openNcrs })}
        </p>
      </div>

      <div className="mt-auto border-t border-neutral-200 pt-4">
        <CapitalStructureChart contract={contract} budget={budget} actual={actual} projectCount={projectCount} />
      </div>
    </div>
  );
}

export function HeroBand({ filter = {}, health = '' }: { filter?: DashboardFilter; health?: string }) {
  const executive = useExecutiveDashboard(filter, { compare: 'previous' });
  const portfolio = usePortfolio(filter);
  const cashPosition = useCashPosition();
  const cashFlow = useCashFlow(filter);

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

  const deltaCashIn = executive.data?.delta?.['finance.cashIn'];

  const isLoading = cashPosition.isLoading || portfolio.isLoading;

  const cashSeries = (cashFlow.data?.series ?? []).map((m) => m.net);

  return (
    <HeroBandView
      cashOnHand={cashOnHand}
      netCashFlow={netCashFlow}
      criticalProjects={criticalProjects}
      openNcrs={openNcrs}
      contract={contract}
      budget={budget}
      actual={actual}
      projectCount={projectCount}
      deltaCashIn={deltaCashIn ? { pctChange: deltaCashIn.pctChange, direction: deltaCashIn.direction } : undefined}
      cashSeries={cashSeries}
      isLoading={isLoading}
    />
  );
}
