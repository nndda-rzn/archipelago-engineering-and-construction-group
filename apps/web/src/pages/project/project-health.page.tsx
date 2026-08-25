import { useState } from 'react';
import { Badge, Button } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useProjectHealth } from '@/features/project';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const healthVariant: Record<string, 'default' | 'success' | 'warning'> = {
  NO_BUDGET: 'default',
  ON_TRACK: 'success',
  AT_RISK: 'warning',
  CRITICAL: 'warning',
};

const healthLabel: Record<string, string> = {
  NO_BUDGET: 'Belum Ada Budget',
  ON_TRACK: 'Sehat (On Track)',
  AT_RISK: 'Berisiko (At Risk)',
  CRITICAL: 'Kritis (Critical)',
};

function Bar({ value, color }: { value: number | null; color: string }) {
  const width = value == null ? 0 : Math.min(value, 150);
  return (
    <div className="h-2 w-28 overflow-hidden rounded bg-neutral-100">
      <div className={`h-full ${color}`} style={{ width: `${width}%` }} />
    </div>
  );
}

export function ProjectHealthPage() {
  const [projectId, setProjectId] = useState('');
  const projects = useProjects({ page: 1, pageSize: 100 });
  const defaultProjectId = projectId || projects.data?.items[0]?.id || '';
  const { data, isLoading, isError, refetch } = useProjectHealth(defaultProjectId);

  const barColor =
    data?.health === 'ON_TRACK' ? 'bg-semantic-success' : data?.health === 'AT_RISK' ? 'bg-semantic-warning' : 'bg-destructive-600';

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Project Health</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Actual cost vs budget per WBS (FR-PRJ-004)</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={defaultProjectId}
            onChange={(e) => setProjectId(e.target.value)}
            aria-label="Pilih project"
            className="flex h-9 w-56 rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="">Pilih project…</option>
            {(projects.data?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
          </select>
          <Button size="sm" variant="secondary" onClick={() => refetch()} disabled={isLoading}>Muat Ulang</Button>
        </div>
      </div>

      {!defaultProjectId && <p className="text-body-sm text-neutral-500">Pilih project untuk melihat health.</p>}

      {defaultProjectId && (
        <div className="space-y-6">
          {isLoading && <p className="text-body-sm text-neutral-500">Menghitung…</p>}
          {isError && <p className="text-body-sm text-destructive-600">Gagal memuat health project.</p>}
          {!isLoading && !isError && data && (
            <>
              <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-h2 text-neutral-950">{data.projectName}</h2>
                    <p className="mt-1 text-caption text-neutral-500">
                      {data.projectCode} · {data.client} · {data.legalEntityCode}
                    </p>
                  </div>
                  <Badge variant={healthVariant[data.health] ?? 'default'}>{healthLabel[data.health] ?? data.health}</Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="rounded-md border border-neutral-100 p-3">
                    <p className="text-caption uppercase tracking-wide text-neutral-500">Budget</p>
                    <p className="mt-1 font-mono tabular-nums text-h3 text-neutral-800">{fmt(data.totalBudget)}</p>
                  </div>
                  <div className="rounded-md border border-neutral-100 p-3">
                    <p className="text-caption uppercase tracking-wide text-neutral-500">Actual Cost</p>
                    <p className="mt-1 font-mono tabular-nums text-h3 text-neutral-800">{fmt(data.totalActual)}</p>
                  </div>
                  <div className="rounded-md border border-neutral-100 p-3">
                    <p className="text-caption uppercase tracking-wide text-neutral-500">Revenue</p>
                    <p className="mt-1 font-mono tabular-nums text-h3 text-neutral-800">{fmt(data.revenue)}</p>
                  </div>
                  <div className="rounded-md border border-neutral-100 p-3">
                    <p className="text-caption uppercase tracking-wide text-neutral-500">Utilisasi</p>
                    <p className="mt-1 font-mono tabular-nums text-h3 text-neutral-800">
                      {data.utilization != null ? `${data.utilization}%` : '—'}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-4 text-caption text-neutral-500">
                  <span>
                    Variance:{' '}
                    <span className={data.variance >= 0 ? 'font-medium text-semantic-success' : 'font-medium text-destructive-600'}>
                      {fmt(data.variance)}
                    </span>
                  </span>
                  <span>Kontrak: {fmt(data.contractValue)}</span>
                </div>
              </div>

              <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
                <table className="w-full text-left text-body">
                  <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
                    <tr>
                      <th className="px-4 py-2">WBS</th>
                      <th className="px-4 py-2 text-right">Budget</th>
                      <th className="px-4 py-2 text-right">Actual</th>
                      <th className="px-4 py-2 text-right">Variance</th>
                      <th className="px-4 py-2">Utilisasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.wbs.map((w) => (
                      <tr key={w.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                        <td className="px-4 py-2">
                          <span className="font-mono text-neutral-600">{w.code}</span>
                          <span className="ml-2 text-neutral-800">{w.name}</span>
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-neutral-700">{w.budget > 0 ? fmt(w.budget) : '—'}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-neutral-700">{w.actual > 0 ? fmt(w.actual) : '—'}</td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          <span className={w.variance >= 0 ? 'text-neutral-600' : 'text-destructive-600'}>
                            {fmt(w.variance)}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <Bar value={w.utilization} color={barColor} />
                            <span className="w-14 text-right font-mono text-caption text-neutral-600">
                              {w.utilization != null ? `${w.utilization}%` : '—'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {data.wbs.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-4 text-caption text-neutral-500">Belum ada WBS.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
