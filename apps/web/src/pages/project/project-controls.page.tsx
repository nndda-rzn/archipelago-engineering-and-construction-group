import { useState } from 'react';
import { DataGrid } from '@aec/ui';
import {
  useCommitment, useControlAccounts, useCostCodes, useEvm, useForecasts,
} from '@/features/project';
import { useProjects } from '@/entities/project';
import { formatIdr as fmt } from '@/shared/lib/format';
import { costCodeColumns, caColumns, forecastColumns, CostCodeForm, ControlAccountForm, ForecastForm } from '@/features/project/ui';

const PAGE_SIZE = 20;

type Tab = 'costcodes' | 'control-accounts' | 'forecasts' | 'evm' | 'commitment';

const TAB_LABELS: Record<Tab, string> = {
  costcodes: 'Cost Code',
  'control-accounts': 'Control Account',
  forecasts: 'Forecast',
  evm: 'EVM',
  commitment: 'Commitment',
};

export function ProjectControlsPage() {
  const [tab, setTab] = useState<Tab>('costcodes');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [projectId, setProjectId] = useState('');
  const [showForm, setShowForm] = useState(false);

  const projects = useProjects({ page: 1, pageSize: 100 });
  const costCodes = useCostCodes(projectId, { page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const controlAccounts = useControlAccounts(projectId, { page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const forecasts = useForecasts(projectId);
  const evm = useEvm(projectId);
  const commitment = useCommitment(projectId);

  const gridProps = { pagination, onPaginationChange: setPagination };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Project Controls</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Cost code, control account, forecast, EVM, commitment (Fase 11B)</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={projectId}
            onChange={(e) => { setProjectId(e.target.value); setShowForm(false); }}
            className="flex h-9 w-64 rounded-md border border-neutral-200 bg-white px-3 text-body"
          >
            <option value="">Pilih project…</option>
            {(projects.data?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
          </select>
          {projectId && (
            <button
              onClick={() => setShowForm((s) => !s)}
              className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-body-sm font-medium text-neutral-600 hover:border-neutral-300"
            >
              {showForm ? 'Tutup' : '+ Buat'}
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(['costcodes', 'control-accounts', 'forecasts', 'evm', 'commitment'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setShowForm(false); }}
            className={`rounded-md px-3 py-1.5 text-body-sm font-medium transition-colors ${
              tab === t ? 'bg-racing-red-600 text-white' : 'border border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {showForm && tab === 'costcodes' && projectId && <CostCodeForm projectId={projectId} />}
      {showForm && tab === 'control-accounts' && projectId && <ControlAccountForm projectId={projectId} />}
      {showForm && tab === 'forecasts' && projectId && <ForecastForm projectId={projectId} />}

      {tab === 'costcodes' && (
        <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
          <DataGrid columns={costCodeColumns} data={costCodes.data?.items ?? []} rowCount={costCodes.data?.total ?? 0} isLoading={costCodes.isLoading} isError={costCodes.isError} onRetry={() => costCodes.refetch()} emptyMessage="Belum ada cost code" {...gridProps} />
        </div>
      )}

      {tab === 'control-accounts' && (
        <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
          <DataGrid columns={caColumns} data={controlAccounts.data?.items ?? []} rowCount={controlAccounts.data?.total ?? 0} isLoading={controlAccounts.isLoading} isError={controlAccounts.isError} onRetry={() => controlAccounts.refetch()} emptyMessage="Belum ada control account" {...gridProps} />
        </div>
      )}

      {tab === 'forecasts' && (
        <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
          <DataGrid columns={forecastColumns} data={forecasts.data?.items ?? []} rowCount={forecasts.data?.items?.length ?? 0} isLoading={forecasts.isLoading} isError={forecasts.isError} onRetry={() => forecasts.refetch()} emptyMessage="Belum ada forecast" {...gridProps} />
        </div>
      )}

      {tab === 'evm' && evm.data && (
        <div className="rounded-md border border-neutral-200 bg-white p-6 shadow-xs">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {[
              { label: 'PV', value: evm.data.metrics.pv },
              { label: 'EV', value: evm.data.metrics.ev },
              { label: 'AC', value: evm.data.metrics.ac },
              { label: 'CV', value: evm.data.metrics.cv },
              { label: 'SV', value: evm.data.metrics.sv },
              { label: 'BAC', value: evm.data.metrics.bac },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-md border border-neutral-100 p-3">
                <p className="text-caption text-neutral-500">{label}</p>
                <p className={`mt-1 font-mono text-h3 tabular-nums ${value < 0 ? 'text-destructive-600' : 'text-neutral-800'}`}>{fmt(value)}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-6 text-body-sm">
            <span>CPI: <span className="font-mono font-medium">{evm.data.metrics.cpi?.toFixed(2) ?? '-'}</span></span>
            <span>SPI: <span className="font-mono font-medium">{evm.data.metrics.spi?.toFixed(2) ?? '-'}</span></span>
            <span>Progress: <span className="font-mono font-medium">{evm.data.metrics.progressPercent}%</span></span>
          </div>
        </div>
      )}

      {tab === 'commitment' && commitment.data && (
        <div className="rounded-md border border-neutral-200 bg-white p-6 shadow-xs">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-md border border-neutral-100 p-3">
              <p className="text-caption text-neutral-500">PO Commitment</p>
              <p className="mt-1 font-mono text-h3 tabular-nums text-neutral-800">{fmt(commitment.data.poCommitment)}</p>
            </div>
            <div className="rounded-md border border-neutral-100 p-3">
              <p className="text-caption text-neutral-500">Subcontract Commitment</p>
              <p className="mt-1 font-mono text-h3 tabular-nums text-neutral-800">{fmt(commitment.data.subcontractCommitment)}</p>
            </div>
            <div className="rounded-md border border-neutral-100 p-3">
              <p className="text-caption text-neutral-500">Total Commitment</p>
              <p className="mt-1 font-mono text-h3 tabular-nums text-neutral-800">{fmt(commitment.data.totalCommitment)}</p>
            </div>
            <div className="rounded-md border border-neutral-100 p-3">
              <p className="text-caption text-neutral-500">Sisa Budget</p>
              <p className={`mt-1 font-mono text-h3 tabular-nums ${commitment.data.remainingBudget >= 0 ? 'text-financial-positive-500' : 'text-destructive-600'}`}>{fmt(commitment.data.remainingBudget)}</p>
            </div>
          </div>
          <p className="mt-4 text-caption text-neutral-500">Total budget: {fmt(commitment.data.totalBudget)}</p>
        </div>
      )}
    </div>
  );
}
