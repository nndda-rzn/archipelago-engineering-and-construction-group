import { Badge, Button, EmptyState, ErrorState, KpiSkeleton } from '@aec/ui';
import { usePortfolio } from '@/features/project';
import { DashboardGrid, healthMeta, type HealthKey } from '@/widgets/dashboard-grid';
import { HealthDonut } from '@/widgets/dashboard-charts';
import { LastUpdated } from '@/widgets/last-updated';
import { formatIdr as fmt } from '@/shared/lib/format';

const PORTFOLIO_KEY = ['projects', 'analytics', 'portfolio'] as const;

export function DashboardPage() {
  const { data, isLoading, isError, refetch } = usePortfolio();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Dashboard Eksekutif</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Portfolio project — cost, revenue &amp; health</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button size="sm" variant="secondary" onClick={() => refetch()} disabled={isLoading}>Muat Ulang</Button>
          <LastUpdated queryKey={PORTFOLIO_KEY} />
        </div>
      </div>

      {isLoading && <KpiSkeleton count={4} />}
      {isError && (
        <ErrorState
          message="Portfolio tidak dapat dimuat."
          onRetry={() => refetch()}
          className="rounded-md border border-neutral-200 bg-white shadow-xs"
        />
      )}

      {!isLoading && !isError && data && (
        <>
          <DashboardGrid totals={data.totals} healthCounts={data.healthCounts} projectCount={data.totals.projectCount} />

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs xl:col-span-1">
              <h2 className="mb-2 text-h2 text-neutral-950">Distribusi Health</h2>
              <HealthDonut
                data={Object.entries(data.healthCounts).map(([k, v]) => ({ name: k, value: v }))}
              />
            </div>
            <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs xl:col-span-2">
              <h2 className="mb-3 text-h2 text-neutral-950">Portfolio Project</h2>
            {data.items.length === 0 ? (
              <EmptyState title="Belum ada project" description="Buat project pertama untuk mulai mengelola portfolio." />
            ) : (
            <table className="w-full text-left text-body">
              <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-2">Project</th>
                  <th className="px-4 py-2">Klien</th>
                  <th className="px-4 py-2 text-right">Kontrak</th>
                  <th className="px-4 py-2 text-right">Budget</th>
                  <th className="px-4 py-2 text-right">Actual</th>
                  <th className="px-4 py-2 text-right">Revenue</th>
                  <th className="px-4 py-2 text-right">Utilisasi</th>
                  <th className="px-4 py-2">Health</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.projectId} className="border-t border-neutral-100 hover:bg-neutral-50">
                    <td className="px-4 py-2">
                      <span className="font-mono text-neutral-600">{p.projectCode}</span>
                      <span className="ml-2 text-neutral-800">{p.projectName}</span>
                    </td>
                    <td className="px-4 py-2 text-neutral-600">{p.client}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-neutral-600">{fmt(p.contractValue)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-neutral-700">{p.budget > 0 ? fmt(p.budget) : '—'}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-neutral-700">{p.actual > 0 ? fmt(p.actual) : '—'}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-neutral-700">{p.revenue > 0 ? fmt(p.revenue) : '—'}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-700">{p.utilization != null ? `${p.utilization}%` : '—'}</td>
                    <td className="px-4 py-2">
                      <Badge variant={healthMeta[p.health as HealthKey]?.badgeVariant ?? 'default'}>
                        {healthMeta[p.health as HealthKey]?.label ?? p.health}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {data.items.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-4 text-caption text-neutral-500">Belum ada project.</td></tr>
                )}
              </tbody>
              <tfoot className="border-t border-neutral-200 bg-neutral-50 font-medium">
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-caption uppercase tracking-wide text-neutral-500">Total</td>
                  <td className="px-4 py-2 text-right tabular-nums text-neutral-800">{fmt(data.totals.totalBudget)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-neutral-800">{fmt(data.totals.totalActual)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-neutral-800">{fmt(data.totals.totalRevenue)}</td>
                  <td className="px-4 py-2"></td>
                  <td className="px-4 py-2"></td>
                </tr>
              </tfoot>
            </table>
            )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
