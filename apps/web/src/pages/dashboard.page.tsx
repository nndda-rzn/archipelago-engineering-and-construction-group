import { useEffect, useState } from 'react';
import { Permission } from '@aec/shared-types';
import { Button, ErrorState, SectionBand, Skeleton } from '@aec/ui';
import { usePermissions } from '@/entities/session';
import { DashboardFilterBar, useDashboardFilter } from '@/widgets/dashboard-filter-bar';
import { PageHeader, ScopeChip } from '@/widgets/page-header';
import { ControlTowerView } from '@/widgets/control-tower';
import { AnomalyTriage } from '@/widgets/anomaly-triage';
import { useCashFlow, useControlTower, useLiveAnalytics } from '@/features/analytics';
import { useLegalEntities } from '@/entities/legal-entity';
import { LiveIndicator } from '@/shared/ui/live-indicator';
import { LiveValue } from '@/shared/ui/live-value';
import { formatIdrAxis } from '@/shared/lib/format';
import { formatKpiValue } from '@/widgets/control-tower';

/** Tick 1 detik agar "updated Ns ago" hidup tanpa membebani render. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

/** Tombol Live/Paused + indikator koneksi. */
function LiveControls({ connected, lastChangeAt, enabled, onToggle, now }: {
  connected: boolean;
  lastChangeAt: number | null;
  enabled: boolean;
  onToggle: () => void;
  now: number;
}) {
  return (
    <>
      <LiveIndicator connected={connected && enabled} lastChangeAt={lastChangeAt} now={now} />
      <Button size="sm" variant={enabled ? 'primary' : 'secondary'} onClick={onToggle} aria-pressed={enabled}>
        {enabled ? '● Live' : '○ Paused'}
      </Button>
    </>
  );
}

export function DashboardPage() {
  const { filter, preset, entityId } = useDashboardFilter();
  const { can } = usePermissions();
  const entities = useLegalEntities({ page: 1, pageSize: 200 });

  const canAnalytics = can(Permission.AnalyticsView);

  const controlTower = useControlTower(filter);
  const cashFlow = useCashFlow(filter);
  const live = useLiveAnalytics(canAnalytics);
  const now = useNow(live.enabled);

  const entityLabel = entityId
    ? entities.data?.items.find((e) => e.id === entityId)?.code ?? 'Entity'
    : 'All entities';

  const header = (
    <PageHeader
      title="Dashboard · Control Tower"
      subtitle="Portfolio command center · cost, cash, delivery & risk"
      scope={
        <>
          <ScopeChip>{entityLabel}</ScopeChip>
          <ScopeChip mono>{preset}</ScopeChip>
        </>
      }
      actions={
        canAnalytics ? (
          <LiveControls
            connected={live.connected}
            lastChangeAt={live.lastChangeAt}
            enabled={live.enabled}
            onToggle={() => live.setEnabled(!live.enabled)}
            now={now}
          />
        ) : undefined
      }
    />
  );

  // Tanpa izin analytics, dashboard tetap menampilkan filter + portfolio sederhana.
  if (!canAnalytics) {
    return (
      <div className="mx-auto flex max-w-[1680px] flex-col gap-tier">
        {header}
        <DashboardFilterBar />
        <SectionBand name="Portfolio">
          <p className="text-body-sm text-neutral-500">Analytics is not available for your role.</p>
        </SectionBand>
      </div>
    );
  }

  if (controlTower.isLoading) {
    return (
      <div className="mx-auto flex max-w-[1680px] flex-col gap-tier" aria-label="Loading dashboard">
        {header}
        <DashboardFilterBar />
        <div className="grid grid-cols-1 gap-x-cell gap-y-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex min-w-0 flex-col gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-1.5 w-full" />
            </div>
          ))}
        </div>
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (controlTower.isError || !controlTower.data) {
    return (
      <div className="mx-auto flex max-w-[1680px] flex-col gap-tier">
        {header}
        <DashboardFilterBar />
        <div role="alert">
          <ErrorState message="The control tower could not be loaded." onRetry={() => controlTower.refetch()} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[1680px] flex-col gap-tier">
      {header}
      <DashboardFilterBar />

      <ControlTowerView
        data={controlTower.data}
        cashFlowSeries={cashFlow.data?.series ?? []}
        liveControl={<LiveIndicator connected={live.connected && live.enabled} lastChangeAt={live.lastChangeAt} now={now} />}
        renderKpiValue={(kpi) =>
          kpi.unit === 'idr' ? (
            <LiveValue key={kpi.key} value={kpi.value} format={formatIdrAxis} data-slot="kpi-value" />
          ) : (
            formatKpiValue(kpi)
          )
        }
      />

      <SectionBand name="Anomaly triage">
        <AnomalyTriage />
      </SectionBand>
    </div>
  );
}
