import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid, Input, Label } from '@aec/ui';
import {
  useCommitment, useControlAccounts, useCostCodes, useCreateControlAccount, useCreateCostCode,
  useCreateForecast, useEvm, useForecasts,
  type ControlAccount, type CostCode, type Forecast,
} from '@/features/project';
import { useProjects } from '@/entities/project';
import { useWbsTree } from '@/entities/wbs';
import { formatIdr as fmt } from '@/shared/lib/format';

const PAGE_SIZE = 20;

const costCodeHelper = createColumnHelper<CostCode>();
const caHelper = createColumnHelper<ControlAccount>();
const forecastHelper = createColumnHelper<Forecast>();

const costCodeColumns = [
  costCodeHelper.accessor('code', { header: 'Kode', cell: (i) => <span className="font-mono text-neutral-800">{i.getValue()}</span> }),
  costCodeHelper.accessor('name', { header: 'Nama', cell: (i) => <span className="text-neutral-800">{i.getValue()}</span> }),
  costCodeHelper.accessor('wbsItem', { header: 'WBS', cell: (i) => <span className="font-mono text-neutral-600">{i.getValue()?.code ?? '—'}</span> }),
  costCodeHelper.accessor('costType', { header: 'Tipe', cell: (i) => <Badge variant="default">{i.getValue()}</Badge> }),
  costCodeHelper.accessor('status', { header: 'Status', cell: (i) => <Badge variant={i.getValue() === 'ACTIVE' ? 'success' : 'warning'}>{i.getValue()}</Badge> }),
];

const caColumns = [
  caHelper.accessor('code', { header: 'Kode', cell: (i) => <span className="font-mono text-neutral-800">{i.getValue()}</span> }),
  caHelper.accessor('name', { header: 'Nama', cell: (i) => <span className="text-neutral-800">{i.getValue()}</span> }),
  caHelper.accessor('wbsItem', { header: 'WBS', cell: (i) => <span className="font-mono text-neutral-600">{i.getValue()?.code}</span> }),
  caHelper.accessor('responsibleManager', { header: 'Responsible', cell: (i) => <span className="text-neutral-700">{i.getValue()}</span> }),
  caHelper.accessor('budgetAmount', { header: 'Budget', cell: (i) => <span className="font-mono tabular-nums text-neutral-800">{fmt(i.getValue())}</span> }),
  caHelper.accessor('plannedValue', { header: 'PV', cell: (i) => <span className="font-mono tabular-nums text-neutral-700">{fmt(i.getValue())}</span> }),
];

const forecastColumns = [
  forecastHelper.accessor('version', { header: 'Versi', cell: (i) => <span className="font-mono text-neutral-800">v{i.getValue()}</span> }),
  forecastHelper.accessor('period', { header: 'Periode', cell: (i) => <span className="font-mono text-neutral-600">{i.getValue() ?? '—'}</span> }),
  forecastHelper.accessor('estimateAtCompletion', { header: 'EAC', cell: (i) => <span className="font-mono tabular-nums text-neutral-800">{fmt(i.getValue())}</span> }),
  forecastHelper.accessor('estimateToComplete', { header: 'ETC', cell: (i) => <span className="font-mono tabular-nums text-neutral-700">{fmt(i.getValue())}</span> }),
  forecastHelper.accessor('varianceAtCompletion', { header: 'VAC', cell: (i) => <span className={`font-mono tabular-nums ${i.getValue() >= 0 ? 'text-semantic-success' : 'text-destructive-600'}`}>{fmt(i.getValue())}</span> }),
  forecastHelper.accessor('status', { header: 'Status', cell: (i) => <Badge variant="default">{i.getValue()}</Badge> }),
];

type Tab = 'cost-codes' | 'control-accounts' | 'commitment' | 'forecast' | 'evm';

export function ProjectControlsPage() {
  const [projectId, setProjectId] = useState('');
  const [tab, setTab] = useState<Tab>('cost-codes');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const projects = useProjects({ page: 1, pageSize: 100 });
  const defaultProjectId = projectId || projects.data?.items[0]?.id || '';

  const costCodes = useCostCodes(defaultProjectId, { page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const controlAccounts = useControlAccounts(defaultProjectId, { page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const commitment = useCommitment(defaultProjectId);
  const forecasts = useForecasts(defaultProjectId);
  const evm = useEvm(defaultProjectId);

  const gridProps = { pagination, onPaginationChange: setPagination };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Project Controls</h1>
          <p className="mt-1 text-body-sm text-neutral-500">CBS, control account, commitment, forecast, EVM (Fase 11B)</p>
        </div>
        <div className="w-72">
          <select
            value={defaultProjectId}
            onChange={(e) => setProjectId(e.target.value)}
            aria-label="Pilih project"
            className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body text-neutral-900 hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="">Pilih project…</option>
            {(projects.data?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
          </select>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        {(['cost-codes', 'control-accounts', 'commitment', 'forecast', 'evm'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-body-sm font-medium transition-colors ${
              tab === t ? 'bg-racing-red-600 text-white' : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300'
            }`}
          >
            {t === 'cost-codes' ? 'Cost Code' : t === 'control-accounts' ? 'Control Account' : t === 'commitment' ? 'Commitment' : t === 'forecast' ? 'Forecast' : 'EVM'}
          </button>
        ))}
      </div>

      {!defaultProjectId && <p className="text-body-sm text-neutral-500">Pilih project untuk melihat project controls.</p>}

      {defaultProjectId && tab === 'cost-codes' && (
        <>
          <CostCodeForm projectId={defaultProjectId} />
          <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
            <DataGrid columns={costCodeColumns} data={costCodes.data?.items ?? []} rowCount={costCodes.data?.total ?? 0} isLoading={costCodes.isLoading} isError={costCodes.isError} onRetry={() => costCodes.refetch()} emptyMessage="Belum ada cost code" {...gridProps} />
          </div>
        </>
      )}

      {defaultProjectId && tab === 'control-accounts' && (
        <>
          <ControlAccountForm projectId={defaultProjectId} />
          <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
            <DataGrid columns={caColumns} data={controlAccounts.data?.items ?? []} rowCount={controlAccounts.data?.total ?? 0} isLoading={controlAccounts.isLoading} isError={controlAccounts.isError} onRetry={() => controlAccounts.refetch()} emptyMessage="Belum ada control account" {...gridProps} />
          </div>
        </>
      )}

      {defaultProjectId && tab === 'commitment' && (
        <div className="rounded-md border border-neutral-200 bg-white p-6 shadow-xs">
          {commitment.isLoading && <p className="text-body-sm text-neutral-500">Menghitung…</p>}
          {commitment.data && (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-md border border-neutral-100 p-3">
                  <p className="text-caption uppercase tracking-wide text-neutral-500">Komitmen PO (Released)</p>
                  <p className="mt-1 font-mono tabular-nums text-h3 text-neutral-800">{fmt(commitment.data.poCommitment)}</p>
                </div>
                <div className="rounded-md border border-neutral-100 p-3">
                  <p className="text-caption uppercase tracking-wide text-neutral-500">Komitmen Subkon</p>
                  <p className="mt-1 font-mono tabular-nums text-h3 text-neutral-800">{fmt(commitment.data.subcontractCommitment)}</p>
                </div>
                <div className="rounded-md border border-neutral-100 p-3">
                  <p className="text-caption uppercase tracking-wide text-neutral-500">Total Komitmen</p>
                  <p className="mt-1 font-mono tabular-nums text-h3 text-neutral-800">{fmt(commitment.data.totalCommitment)}</p>
                </div>
                <div className="rounded-md border border-neutral-100 p-3">
                  <p className="text-caption uppercase tracking-wide text-neutral-500">Sisa Budget</p>
                  <p className={`mt-1 font-mono tabular-nums text-h3 ${commitment.data.remainingBudget >= 0 ? 'text-semantic-success' : 'text-destructive-600'}`}>{fmt(commitment.data.remainingBudget)}</p>
                </div>
              </div>
              <p className="mt-4 text-caption text-neutral-500">Total budget baseline: {fmt(commitment.data.totalBudget)} (FR-PRJ-007)</p>
            </>
          )}
        </div>
      )}

      {defaultProjectId && tab === 'forecast' && (
        <>
          <ForecastForm projectId={defaultProjectId} />
          <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
            <table className="w-full text-left text-body">
              <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-2">Versi</th>
                  <th className="px-4 py-2">Periode</th>
                  <th className="px-4 py-2 text-right">EAC</th>
                  <th className="px-4 py-2 text-right">ETC</th>
                  <th className="px-4 py-2 text-right">VAC</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {(forecasts.data?.items ?? []).map((f) => (
                  <tr key={f.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                    <td className="px-4 py-2 font-mono text-neutral-800">v{f.version}</td>
                    <td className="px-4 py-2 font-mono text-neutral-600">{f.period ?? '—'}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-800">{fmt(f.estimateAtCompletion)}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-700">{fmt(f.estimateToComplete)}</td>
                    <td className={`px-4 py-2 text-right font-mono tabular-nums ${f.varianceAtCompletion >= 0 ? 'text-semantic-success' : 'text-destructive-600'}`}>{fmt(f.varianceAtCompletion)}</td>
                    <td className="px-4 py-2"><Badge variant="default">{f.status}</Badge></td>
                  </tr>
                ))}
                {(forecasts.data?.items ?? []).length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-4 text-caption text-neutral-500">Belum ada forecast.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {defaultProjectId && tab === 'evm' && (
        <div className="rounded-md border border-neutral-200 bg-white p-6 shadow-xs">
          {evm.isLoading && <p className="text-body-sm text-neutral-500">Menghitung EVM…</p>}
          {evm.data && (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {([
                  ['PV (Planned Value)', evm.data.metrics.pv],
                  ['EV (Earned Value)', evm.data.metrics.ev],
                  ['AC (Actual Cost)', evm.data.metrics.ac],
                  ['BAC (Budget)', evm.data.metrics.bac],
                ] as const).map(([label, val]) => (
                  <div key={label} className="rounded-md border border-neutral-100 p-3">
                    <p className="text-caption uppercase tracking-wide text-neutral-500">{label}</p>
                    <p className="mt-1 font-mono tabular-nums text-h3 text-neutral-800">{fmt(val)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-md border border-neutral-100 p-3">
                  <p className="text-caption uppercase tracking-wide text-neutral-500">CPI</p>
                  <p className={`mt-1 font-mono tabular-nums text-h3 ${(evm.data.metrics.cpi ?? 1) >= 1 ? 'text-semantic-success' : 'text-destructive-600'}`}>{evm.data.metrics.cpi ?? '—'}</p>
                  <p className="text-caption text-neutral-500">{evm.data.interpretation.cpi}</p>
                </div>
                <div className="rounded-md border border-neutral-100 p-3">
                  <p className="text-caption uppercase tracking-wide text-neutral-500">SPI</p>
                  <p className={`mt-1 font-mono tabular-nums text-h3 ${(evm.data.metrics.spi ?? 1) >= 1 ? 'text-semantic-success' : 'text-destructive-600'}`}>{evm.data.metrics.spi ?? '—'}</p>
                  <p className="text-caption text-neutral-500">{evm.data.interpretation.spi}</p>
                </div>
                <div className="rounded-md border border-neutral-100 p-3">
                  <p className="text-caption uppercase tracking-wide text-neutral-500">CV</p>
                  <p className={`mt-1 font-mono tabular-nums text-h3 ${evm.data.metrics.cv >= 0 ? 'text-semantic-success' : 'text-destructive-600'}`}>{fmt(evm.data.metrics.cv)}</p>
                </div>
                <div className="rounded-md border border-neutral-100 p-3">
                  <p className="text-caption uppercase tracking-wide text-neutral-500">SV</p>
                  <p className={`mt-1 font-mono tabular-nums text-h3 ${evm.data.metrics.sv >= 0 ? 'text-semantic-success' : 'text-destructive-600'}`}>{fmt(evm.data.metrics.sv)}</p>
                </div>
              </div>
              <p className="mt-4 text-caption text-neutral-500">Progress fisik rata-rata: {evm.data.metrics.progressPercent}% (FR-PRJ-011)</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CostCodeForm({ projectId }: { projectId: string }) {
  const { data: wbs } = useWbsTree(projectId);
  const create = useCreateCostCode(projectId);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [wbsItemId, setWbsItemId] = useState('');
  const [costType, setCostType] = useState('DIRECT');
  const onSubmit = () => {
    if (!code || !name) return;
    create.mutate({ code, name, wbsItemId: wbsItemId || undefined, costType }, { onSuccess: () => { setCode(''); setName(''); setWbsItemId(''); } });
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="cc-code">Kode</Label>
          <Input id="cc-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="MAT-01" />
        </div>
        <div className="flex-1">
          <Label htmlFor="cc-name">Nama</Label>
          <Input id="cc-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="cc-wbs">WBS</Label>
          <select id="cc-wbs" value={wbsItemId} onChange={(e) => setWbsItemId(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">—</option>
            {(wbs ?? []).map((w) => <option key={w.id} value={w.id}>{w.code} {w.name}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="cc-type">Tipe</Label>
          <select id="cc-type" value={costType} onChange={(e) => setCostType(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            {['DIRECT', 'INDIRECT', 'LABOR', 'MATERIAL', 'SUBCONTRACTOR', 'EQUIPMENT', 'OVERHEAD'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat Cost Code</Button>
      </div>
    </div>
  );
}

function ControlAccountForm({ projectId }: { projectId: string }) {
  const { data: wbs } = useWbsTree(projectId);
  const create = useCreateControlAccount(projectId);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [wbsItemId, setWbsItemId] = useState('');
  const [responsibleManager, setResponsibleManager] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [plannedValue, setPlannedValue] = useState('');
  const onSubmit = () => {
    if (!code || !name || !wbsItemId || !responsibleManager) return;
    create.mutate(
      { code, name, wbsItemId, responsibleManager, budgetAmount: budgetAmount ? Number(budgetAmount) : undefined, plannedValue: plannedValue ? Number(plannedValue) : undefined },
      { onSuccess: () => { setCode(''); setName(''); setWbsItemId(''); setResponsibleManager(''); setBudgetAmount(''); setPlannedValue(''); } },
    );
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="ca-code">Kode</Label>
          <Input id="ca-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="CA-1" />
        </div>
        <div className="flex-1">
          <Label htmlFor="ca-name">Nama</Label>
          <Input id="ca-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ca-wbs">WBS</Label>
          <select id="ca-wbs" value={wbsItemId} onChange={(e) => setWbsItemId(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Pilih…</option>
            {(wbs ?? []).map((w) => <option key={w.id} value={w.id}>{w.code} {w.name}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="ca-mgr">Responsible</Label>
          <Input id="ca-mgr" value={responsibleManager} onChange={(e) => setResponsibleManager(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ca-budget">Budget</Label>
          <Input id="ca-budget" type="number" min={0} value={budgetAmount} onChange={(e) => setBudgetAmount(e.target.value)} className="w-28" />
        </div>
        <div>
          <Label htmlFor="ca-pv">PV</Label>
          <Input id="ca-pv" type="number" min={0} value={plannedValue} onChange={(e) => setPlannedValue(e.target.value)} className="w-28" />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat CA</Button>
      </div>
    </div>
  );
}

function ForecastForm({ projectId }: { projectId: string }) {
  const create = useCreateForecast(projectId);
  const [period, setPeriod] = useState('');
  const [eac, setEac] = useState('');
  const [etc, setEtc] = useState('');
  const onSubmit = () => {
    if (!period || !eac) return;
    create.mutate({ period, estimateAtCompletion: Number(eac), estimateToComplete: etc ? Number(etc) : undefined }, { onSuccess: () => { setPeriod(''); setEac(''); setEtc(''); } });
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="fc-period">Periode</Label>
          <Input id="fc-period" value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-08" />
        </div>
        <div>
          <Label htmlFor="fc-eac">EAC</Label>
          <Input id="fc-eac" type="number" min={0} value={eac} onChange={(e) => setEac(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="fc-etc">ETC (opsional)</Label>
          <Input id="fc-etc" type="number" min={0} value={etc} onChange={(e) => setEtc(e.target.value)} />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat Forecast</Button>
      </div>
    </div>
  );
}
