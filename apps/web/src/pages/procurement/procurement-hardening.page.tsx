import { useState } from 'react';
import { Badge, Button, DataGrid, Label } from '@aec/ui';
import {
  useBudgetStatus, useCommercialEvaluation, usePoChanges,
  useVendorPerformanceSummary, useVendorRatings,
} from '@/features/procurement';
import { usePos } from '@/features/procurement/model/purchase-order.api';
import { useRfqs } from '@/features/procurement/model/rfq.api';
import { useProjects } from '@/entities/project';
import { formatIdr as fmt } from '@/shared/lib/format';
import {
  CommercialEvalTable,
  pcColumns,
  PoChangeForm,
  VendorPerformanceSummaryTable,
  VendorRatingForm,
  VendorRatingGrid,
  statusVariant,
} from '@/features/procurement/ui';

const PAGE_SIZE = 20;

type Tab = 'budget' | 'po-change' | 'vendor-perf';

export function ProcurementHardeningPage() {
  const [tab, setTab] = useState<Tab>('budget');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [projectId, setProjectId] = useState('');
  const [poId, setPoId] = useState('');
  const [rfqId, setRfqId] = useState('');

  const projects = useProjects({ page: 1, pageSize: 100 });
  const defaultProjectId = projectId || projects.data?.items[0]?.id || '';
  const budgetStatus = useBudgetStatus(defaultProjectId);
  const pos = usePos({ page: 1, pageSize: 100 });
  const rfqs = useRfqs({ page: 1, pageSize: 100 });
  const poChanges = usePoChanges(poId);
  const commercialEval = useCommercialEvaluation(rfqId);
  const ratings = useVendorRatings({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const summary = useVendorPerformanceSummary();

  const selectCls = 'flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body text-neutral-900 hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-h1 text-neutral-950">Procurement Hardening</h1>
        <p className="mt-1 text-body-sm text-neutral-500">Budget check, technical/commercial eval, PO change, vendor performance (Fase 11E)</p>
      </div>

      <div className="mb-4 flex gap-2">
        {(['budget', 'po-change', 'vendor-perf'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-body-sm font-medium transition-colors ${
              tab === t ? 'bg-racing-red-600 text-white' : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300'
            }`}
          >
            {t === 'budget' ? 'Budget Check' : t === 'po-change' ? 'PO Change' : 'Vendor Performance'}
          </button>
        ))}
      </div>

      {tab === 'budget' && (
        <div className="space-y-4">
          <div className="flex items-end gap-3 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
            <div className="w-72">
              <Label htmlFor="bs-project">Project</Label>
              <select id="bs-project" value={defaultProjectId} onChange={(e) => setProjectId(e.target.value)} className={selectCls}>
                <option value="">Pilih.</option>
                {(projects.data?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
              </select>
            </div>
            <Button size="sm" variant="secondary" onClick={() => budgetStatus.refetch()} disabled={budgetStatus.isLoading}>Muat Ulang</Button>
          </div>
          <div className="rounded-md border border-neutral-200 bg-white p-6 shadow-xs">
            {budgetStatus.isLoading && <p className="text-body-sm text-neutral-500">Menghitung.</p>}
            {budgetStatus.data && (
              <>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {([
                    ['Budget Baseline', budgetStatus.data.budget],
                    ['Komitmen (PO+Subkon)', budgetStatus.data.commitment],
                    ['Estimasi PR', budgetStatus.data.existingPr],
                    ['Sisa Budget', budgetStatus.data.remaining],
                  ] as const).map(([label, val]) => (
                    <div key={label} className="rounded-md border border-neutral-100 p-3">
                      <p className="text-caption uppercase tracking-wide text-neutral-500">{label}</p>
                      <p className={`mt-1 font-mono tabular-nums text-h3 ${val >= 0 ? 'text-neutral-800' : 'text-destructive-600'}`}>{fmt(val)}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-caption text-neutral-500">FR-PRO-002 - PR baru ditolak jika estimasi melebihi sisa budget (409 BUDGET_EXCEEDED).</p>
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'po-change' && (
        <div className="space-y-4">
          <div className="flex items-end gap-3 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
            <div className="w-72">
              <Label htmlFor="poc-po">Purchase Order</Label>
              <select id="poc-po" value={poId} onChange={(e) => setPoId(e.target.value)} className={selectCls}>
                <option value="">Pilih.</option>
                {(pos.data?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.poNumber} - {fmt(p.totalAmount)}</option>)}
              </select>
            </div>
            <div className="w-72">
              <Label htmlFor="poc-rfq">RFQ (commercial eval)</Label>
              <select id="poc-rfq" value={rfqId} onChange={(e) => setRfqId(e.target.value)} className={selectCls}>
                <option value="">Pilih.</option>
                {(rfqs.data?.items ?? []).map((r) => <option key={r.id} value={r.id}>{r.rfqNumber} - {r.title}</option>)}
              </select>
            </div>
          </div>

          {poId && <PoChangeForm poId={poId} />}

          {poId && (
            <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
              <DataGrid
                columns={pcColumns}
                data={poChanges.data?.items ?? []}
                rowCount={poChanges.data?.items.length ?? 0}
                isLoading={poChanges.isLoading}
                isError={false}
                emptyMessage="Belum ada PO change"
              />
            </div>
          )}

          {rfqId && commercialEval.data && (
            <CommercialEvalTable data={commercialEval.data} />
          )}
        </div>
      )}

      {tab === 'vendor-perf' && (
        <>
          <VendorRatingForm />
          <VendorPerformanceSummaryTable items={summary.data?.items ?? []} />
          <VendorRatingGrid
            data={ratings.data?.items ?? []}
            total={ratings.data?.total ?? 0}
            isLoading={ratings.isLoading}
            isError={ratings.isError}
            onRetry={() => ratings.refetch()}
            pagination={pagination}
            onPaginationChange={setPagination}
          />
        </>
      )}
    </div>
  );
}
