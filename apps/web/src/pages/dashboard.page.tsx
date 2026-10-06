import { SegmentedControl } from '@aec/ui';
import { useNavigate } from '@tanstack/react-router';
import { useUrlFilter } from '@/shared/lib/use-url-state';
import { DashboardFilterBar, useDashboardFilter } from '@/widgets/dashboard-filter-bar';
import { SignalRail } from '@/widgets/signal-rail';
import { HeroBand } from '@/widgets/hero-band';
import { LiquidityPanel } from '@/widgets/liquidity-panel';
import { FinancialBand } from '@/widgets/financial-band';
import { PortfolioCanvas } from '@/widgets/portfolio-canvas';
import { PortfolioSpine } from '@/widgets/portfolio-spine';
import { AnomalyTriage } from '@/widgets/anomaly-triage';
import { ProjectRankingBar } from '@/widgets/dashboard-charts';
import { usePortfolio } from '@/features/project';
import type { DashboardFilter } from '@/shared/lib/dashboard-period';

const VIEW_OPTIONS = [
  { value: 'canvas', label: 'Canvas' },
  { value: 'table', label: 'Table' },
];

function PortfolioZone({ filter, health, onSelectHealth }: { filter: DashboardFilter; health: string; onSelectHealth: (h: string) => void }) {
  const [view, setView] = useUrlFilter('view', 'canvas');
  const navigate = useNavigate();
  const { data } = usePortfolio(filter);
  const items = data?.items ?? [];

  return (
    <section className="grid gap-6 xl:grid-cols-12">
      <div className="xl:col-span-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-h2 text-neutral-950">Portfolio</h2>
          <SegmentedControl aria-label="Portfolio view" options={VIEW_OPTIONS} value={view} onValueChange={setView} />
        </div>
        {view === 'table' ? (
          <PortfolioSpine filter={filter} health={health} />
        ) : (
          <PortfolioCanvas filter={filter} health={health} onSelectHealth={onSelectHealth} />
        )}
      </div>
      <div className="xl:col-span-5">
        <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
          <h2 className="mb-3 text-h2 text-neutral-950">Worst variance</h2>
          <ProjectRankingBar
            items={items}
            onSelect={(projectId) => navigate({ to: '/project-health', search: { project: projectId } as never })}
          />
        </div>
      </div>
    </section>
  );
}

export function DashboardPage() {
  const { filter } = useDashboardFilter();
  const [health, setHealth] = useUrlFilter('health');
  const [bucket, setBucket] = useUrlFilter('bucket');

  const zones = [
    <DashboardFilterBar key="filter" />,
    <SignalRail key="signal" filter={filter} />,
    <div key="bands" data-slot="hero-liquidity-row" className="grid gap-6 xl:grid-cols-12">
      <div className="xl:col-span-7">
        <HeroBand filter={filter} health={health} />
      </div>
      <div className="xl:col-span-5">
        <LiquidityPanel filter={filter} />
      </div>
    </div>,
    <FinancialBand key="financial" filter={filter} bucket={bucket} onSelectBucket={setBucket} />,
    <PortfolioZone key="portfolio" filter={filter} health={health} onSelectHealth={setHealth} />,
    <AnomalyTriage key="triage" />,
  ];

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div>
        <h1 className="text-h1 text-neutral-950">Dashboard</h1>
        <p className="mt-1 text-body-sm text-neutral-500">Portfolio command center · cost, cash &amp; health</p>
      </div>

      {zones.map((zone, i) => (
        <div key={i} className="animate-slide-up" style={{ animationDelay: `${i * 40}ms` }}>
          {zone}
        </div>
      ))}
    </div>
  );
}
