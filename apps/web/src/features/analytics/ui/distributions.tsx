import { EmptyState } from '@aec/ui';
import {
  AgingStackedBar,
  ConcentrationBars,
  CostCompositionChart,
  ForecastVsActualChart,
} from '@/widgets/dashboard-charts';
import { Panel, PanelState } from './report-panel';
import { useAging, useArConcentration, useCostComposition, useForecastVsActual } from '../model/analytics.api';
import type { DashboardFilter } from '@/shared/lib/dashboard-period';

/**
 * Zona 4 — Distributions. Grid small-multiples: komposisi biaya, aging AR/AP,
 * konsentrasi AR, dan forecast-vs-actual. Tiap panel memakai `PanelState`
 * sehingga kegagalan fetch tampil sebagai `role="alert"`, bukan angka nol palsu.
 */
export function Distributions({ filter }: { filter: DashboardFilter }) {
  const composition = useCostComposition(filter);
  const aging = useAging(filter);
  const concentration = useArConcentration(filter);
  const forecast = useForecastVsActual(filter);

  return (
    <section aria-label="Distributions" className="flex flex-col gap-cell">
      <h2 className="text-h2 text-neutral-950">Distributions</h2>
      <div className="grid grid-cols-1 gap-cell xl:grid-cols-2">
        <Panel title="Cost composition" subtitle="Published budget by cost type" headingLevel={3}>
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

        <Panel title="Aging AR / AP" subtitle={`Outstanding by bucket · basis ${aging.data?.basisDate ?? 'invoice date'}`} headingLevel={3}>
          <PanelState
            isLoading={aging.isLoading}
            isError={aging.isError}
            onRetry={() => aging.refetch()}
            empty={(aging.data?.ar.length ?? 0) === 0 && (aging.data?.ap.length ?? 0) === 0}
            emptyNode={<EmptyState title="No outstanding balances" description="Everything is settled for this filter." />}
          >
            <div className="flex flex-col gap-4">
              <AgingStackedBar buckets={aging.data?.ar ?? []} label="AR" />
              <AgingStackedBar buckets={aging.data?.ap ?? []} label="AP" />
            </div>
          </PanelState>
        </Panel>

        <Panel title="AR concentration" subtitle="Outstanding receivables by client" headingLevel={3}>
          <PanelState
            isLoading={concentration.isLoading}
            isError={concentration.isError}
            onRetry={() => concentration.refetch()}
            empty={(concentration.data?.items.length ?? 0) === 0}
          >
            {concentration.data && <ConcentrationBars data={concentration.data} />}
          </PanelState>
        </Panel>

        <Panel title="Forecast vs actual" subtitle="Net cash: planned vs realised, per period" headingLevel={3}>
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
    </section>
  );
}
