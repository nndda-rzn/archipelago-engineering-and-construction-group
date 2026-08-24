import { Badge, Button } from '@aec/ui';
import { usePortfolio } from '@/features/project/project.api';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const healthVariant: Record<string, 'default' | 'success' | 'warning'> = {
  NO_BUDGET: 'default',
  ON_TRACK: 'success',
  AT_RISK: 'warning',
  CRITICAL: 'warning',
};

const healthLabel: Record<string, string> = {
  NO_BUDGET: 'Belum Budget',
  ON_TRACK: 'On Track',
  AT_RISK: 'At Risk',
  CRITICAL: 'Kritis',
};

function HealthCount({ label, count, className }: { label: string; count: number; className?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-neutral-100 p-3">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${className ?? 'bg-neutral-300'}`} aria-hidden="true" />
      <div>
        <p className="font-mono text-h3 tabular-nums text-neutral-800">{count}</p>
        <p className="text-caption text-neutral-500">{label}</p>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { data, isLoading, isError, refetch } = usePortfolio();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Dashboard Eksekutif</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Portfolio project — cost, revenue &amp; health</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => refetch()} disabled={isLoading}>Muat Ulang</Button>
      </div>

      {isLoading && <p className="text-body-sm text-neutral-500">Memuat portfolio…</p>}
      {isError && <p className="text-body-sm text-destructive-600">Gagal memuat portfolio.</p>}

      {!isLoading && !isError && data && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
              <p className="text-caption text-neutral-500">Total Kontrak</p>
              <p className="mt-1 font-mono text-h1 tabular-nums text-neutral-950">{fmt(data.totals.totalContract)}</p>
            </div>
            <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
              <p className="text-caption text-neutral-500">Budget</p>
              <p className="mt-1 font-mono text-h1 tabular-nums text-neutral-950">{fmt(data.totals.totalBudget)}</p>
            </div>
            <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
              <p className="text-caption text-neutral-500">Actual Cost</p>
              <p className="mt-1 font-mono text-h1 tabular-nums text-neutral-950">{fmt(data.totals.totalActual)}</p>
            </div>
            <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
              <p className="text-caption text-neutral-500">Revenue</p>
              <p className="mt-1 font-mono text-h1 tabular-nums text-neutral-950">{fmt(data.totals.totalRevenue)}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-5">
            <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
              <p className="text-caption text-neutral-500">Project</p>
              <p className="mt-1 font-mono text-h1 tabular-nums text-neutral-950">{data.totals.projectCount}</p>
            </div>
            <HealthCount label="Sehat" count={data.healthCounts.ON_TRACK} className="bg-project-on-track-500" />
            <HealthCount label="Berisiko" count={data.healthCounts.AT_RISK} className="bg-project-at-risk-500" />
            <HealthCount label="Kritis" count={data.healthCounts.CRITICAL} className="bg-project-critical-500" />
            <HealthCount label="Belum Budget" count={data.healthCounts.NO_BUDGET} />
          </div>

          <div className="mt-6 rounded-md border border-neutral-200 bg-white shadow-xs">
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
                      <Badge variant={healthVariant[p.health] ?? 'default'}>{healthLabel[p.health] ?? p.health}</Badge>
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
          </div>
        </>
      )}
    </div>
  );
}
