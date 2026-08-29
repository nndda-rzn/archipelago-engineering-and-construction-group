import { useState } from 'react';
import { Button, DataGrid, Label, EntitySelect, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import {
  useBudgetStatus, useCommercialEvaluation, usePoChanges, useVendorRatings, useVendorPerformanceSummary,
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
} from '@/features/procurement/ui';

const PAGE_SIZE = 20;
type PaginationState = { pageIndex: number; pageSize: number };

export function BudgetCheckSection() {
  const projects = useProjects({ page: 1, pageSize: 100 });
  const [projectId, setProjectId] = useState('');
  const defaultProjectId = projectId || projects.data?.items[0]?.id || '';
  const budgetStatus = useBudgetStatus(defaultProjectId);

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
        <div className="w-72">
          <Label htmlFor="bs-project">Project</Label>
          <EntitySelect
            value={defaultProjectId}
            onValueChange={setProjectId}
            options={(projects.data?.items ?? []).map((p) => ({ value: p.id, label: p.code }))}
            placeholder="Pilih project…"
            searchPlaceholder="Cari project…"
          />
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
  );
}

export function PoChangeSection() {
  const [poId, setPoId] = useState('');
  const [rfqId, setRfqId] = useState('');
  const pos = usePos({ page: 1, pageSize: 100 });
  const rfqs = useRfqs({ page: 1, pageSize: 100 });
  const poChanges = usePoChanges(poId);
  const commercialEval = useCommercialEvaluation(rfqId);

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
        <div className="w-72">
          <Label htmlFor="poc-po">Purchase Order</Label>
          <Select value={poId} onValueChange={setPoId}>
            <SelectTrigger id="poc-po">
              <SelectValue placeholder="Pilih…" />
            </SelectTrigger>
            <SelectContent>
              {(pos.data?.items ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.poNumber} - {fmt(p.totalAmount)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-72">
          <Label htmlFor="poc-rfq">RFQ (commercial eval)</Label>
          <Select value={rfqId} onValueChange={setRfqId}>
            <SelectTrigger id="poc-rfq">
              <SelectValue placeholder="Pilih…" />
            </SelectTrigger>
            <SelectContent>
              {(rfqs.data?.items ?? []).map((r) => <SelectItem key={r.id} value={r.id}>{r.rfqNumber} - {r.title}</SelectItem>)}
            </SelectContent>
          </Select>
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

      {rfqId && commercialEval.data && <CommercialEvalTable data={commercialEval.data} />}
    </div>
  );
}

export function VendorPerformanceSection() {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: PAGE_SIZE });
  const ratings = useVendorRatings({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const summary = useVendorPerformanceSummary();

  return (
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
  );
}
