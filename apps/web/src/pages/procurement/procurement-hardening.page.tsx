import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid, Input, Label } from '@aec/ui';
import {
  useApprovePoChange, useBudgetStatus, useCommercialEvaluation, useCreatePoChange, useCreateVendorRating,
  usePoChanges, useVendorPerformanceSummary, useVendorRatings,
  type PoChange, type VendorRating,
} from '@/features/procurement';
import { usePos } from '@/features/procurement/model/purchase-order.api';
import { useRfqs } from '@/features/procurement/model/rfq.api';
import { useProjects } from '@/entities/project';
import { useVendors } from '@/features/master-data';
import { formatIdr as fmt } from '@/shared/lib/format';

const PAGE_SIZE = 20;

const statusVariant: Record<string, 'default' | 'success' | 'warning'> = {
  APPROVED: 'success',
  REJECTED: 'warning',
  PASS: 'success',
  REJECT: 'warning',
  PENDING: 'default',
  DRAFT: 'default',
};

const pcHelper = createColumnHelper<PoChange>();
const ratingHelper = createColumnHelper<VendorRating>();

const pcColumns = [
  pcHelper.accessor('changeNumber', { header: 'No.', cell: (i) => <span className="font-mono text-neutral-800">{i.getValue()}</span> }),
  pcHelper.accessor('version', { header: 'Versi', cell: (i) => <span className="font-mono text-neutral-600">v{i.getValue()}</span> }),
  pcHelper.accessor('previousTotal', { header: 'Sebelum', cell: (i) => <span className="font-mono tabular-nums text-neutral-700">{fmt(i.getValue())}</span> }),
  pcHelper.accessor('newTotal', { header: 'Sesudah', cell: (i) => <span className="font-mono tabular-nums text-neutral-800">{fmt(i.getValue())}</span> }),
  pcHelper.accessor('reason', { header: 'Alasan', cell: (i) => <span className="max-w-[200px] truncate text-neutral-600">{i.getValue()}</span> }),
  pcHelper.accessor('status', { header: 'Status', cell: (i) => <Badge variant={statusVariant[i.getValue()] ?? 'default'}>{i.getValue()}</Badge> }),
  pcHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const approve = useApprovePoChange();
      if (row.original.status !== 'DRAFT') return null;
      return <Button size="sm" variant="secondary" loading={approve.isPending} onClick={() => approve.mutate(row.original.id)}>Approve</Button>;
    },
  }),
];

const ratingColumns = [
  ratingHelper.accessor('vendor', { header: 'Vendor', cell: (i) => <span className="text-neutral-800">{i.getValue()?.name}</span> }),
  ratingHelper.accessor('category', { header: 'Kategori', cell: (i) => <Badge variant="default">{i.getValue()}</Badge> }),
  ratingHelper.accessor('score', { header: 'Skor', cell: (i) => <span className="font-mono tabular-nums text-neutral-800">{i.getValue()}/5</span> }),
  ratingHelper.accessor('remark', { header: 'Catatan', cell: (i) => <span className="max-w-[200px] truncate text-neutral-600">{i.getValue() ?? '—'}</span> }),
  ratingHelper.accessor('project', { header: 'Project', cell: (i) => <span className="font-mono text-neutral-600">{i.getValue()?.code ?? '—'}</span> }),
];

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

  const gridProps = { pagination, onPaginationChange: setPagination };

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
              <select id="bs-project" value={defaultProjectId} onChange={(e) => setProjectId(e.target.value)} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body text-neutral-900 hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20">
                <option value="">Pilih…</option>
                {(projects.data?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
              </select>
            </div>
            <Button size="sm" variant="secondary" onClick={() => budgetStatus.refetch()} disabled={budgetStatus.isLoading}>Muat Ulang</Button>
          </div>
          <div className="rounded-md border border-neutral-200 bg-white p-6 shadow-xs">
            {budgetStatus.isLoading && <p className="text-body-sm text-neutral-500">Menghitung…</p>}
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
                <p className="mt-3 text-caption text-neutral-500">FR-PRO-002 — PR baru ditolak jika estimasi melebihi sisa budget (409 BUDGET_EXCEEDED).</p>
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
              <select id="poc-po" value={poId} onChange={(e) => setPoId(e.target.value)} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body text-neutral-900 hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20">
                <option value="">Pilih…</option>
                {(pos.data?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.poNumber} — {fmt(p.totalAmount)}</option>)}
              </select>
            </div>
            <div className="w-72">
              <Label htmlFor="poc-rfq">RFQ (commercial eval)</Label>
              <select id="poc-rfq" value={rfqId} onChange={(e) => setRfqId(e.target.value)} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body text-neutral-900 hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20">
                <option value="">Pilih…</option>
                {(rfqs.data?.items ?? []).map((r) => <option key={r.id} value={r.id}>{r.rfqNumber} — {r.title}</option>)}
              </select>
            </div>
          </div>

          {poId && <PoChangeForm poId={poId} />}

          {poId && (
            <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
              <DataGrid columns={pcColumns} data={poChanges.data?.items ?? []} rowCount={poChanges.data?.items.length ?? 0} isLoading={poChanges.isLoading} isError={false} emptyMessage="Belum ada PO change" />
            </div>
          )}

          {rfqId && commercialEval.data && (
            <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
              <h3 className="text-h3 text-neutral-900">Komparasi Komersial Normalized — {commercialEval.data.rfqNumber}</h3>
              <table className="mt-2 w-full text-left text-body">
                <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-2">Vendor</th>
                    <th className="px-4 py-2 text-right">Total</th>
                    <th className="px-4 py-2 text-right">Lead Time</th>
                    <th className="px-4 py-2 text-right">Skor Normalized</th>
                    <th className="px-4 py-2">Teknis</th>
                    <th className="px-4 py-2">Pemenang</th>
                  </tr>
                </thead>
                <tbody>
                  {commercialEval.data.items.map((i) => (
                    <tr key={i.quoteId} className="border-t border-neutral-100 hover:bg-neutral-50">
                      <td className="px-4 py-2 text-neutral-800">{i.vendor}</td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-700">{fmt(i.totalAmount)}</td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-600">{i.leadTimeDays} hari</td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-800">{i.normalizedScore.toLocaleString('id-ID')}</td>
                      <td className="px-4 py-2"><Badge variant={statusVariant[i.technicalStatus] ?? 'default'}>{i.technicalStatus}</Badge></td>
                      <td className="px-4 py-2">{i.isWinner ? <Badge variant="success">Winner</Badge> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'vendor-perf' && (
        <>
          <RatingForm />
          <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
            <h3 className="text-h3 text-neutral-900">Ringkasan Performance Vendor</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-body">
                <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-2">Vendor</th>
                    <th className="px-4 py-2 text-center">Delivery</th>
                    <th className="px-4 py-2 text-center">Quality</th>
                    <th className="px-4 py-2 text-center">Commercial</th>
                    <th className="px-4 py-2 text-center">HSE</th>
                    <th className="px-4 py-2 text-center">Responsiveness</th>
                    <th className="px-4 py-2 text-center">Overall</th>
                  </tr>
                </thead>
                <tbody>
                  {(summary.data?.items ?? []).map((v) => (
                    <tr key={v.vendorCode} className="border-t border-neutral-100 hover:bg-neutral-50">
                      <td className="px-4 py-2">
                        <span className="font-mono text-neutral-600">{v.vendorCode}</span>
                        <span className="ml-2 text-neutral-800">{v.vendorName}</span>
                      </td>
                      {[v.DELIVERY, v.QUALITY, v.COMMERCIAL, v.HSE, v.RESPONSIVENESS].map((s, idx) => (
                        <td key={idx} className="px-4 py-2 text-center font-mono tabular-nums text-neutral-700">{s || '—'}</td>
                      ))}
                      <td className="px-4 py-2 text-center font-mono tabular-nums font-medium text-neutral-900">{v.overall || '—'}</td>
                    </tr>
                  ))}
                  {(summary.data?.items ?? []).length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-4 text-caption text-neutral-500">Belum ada rating vendor.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
            <DataGrid columns={ratingColumns} data={ratings.data?.items ?? []} rowCount={ratings.data?.total ?? 0} isLoading={ratings.isLoading} isError={ratings.isError} onRetry={() => ratings.refetch()} emptyMessage="Belum ada rating" {...gridProps} />
          </div>
        </>
      )}
    </div>
  );
}

function PoChangeForm({ poId }: { poId: string }) {
  const create = useCreatePoChange(poId);
  const [newTotal, setNewTotal] = useState('');
  const [reason, setReason] = useState('');
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <h3 className="text-h3 text-neutral-900">Buat PO Change (FR-PRO-008)</h3>
      <div className="mt-3 flex items-end gap-3">
        <div>
          <Label htmlFor="poc-new">Total Baru</Label>
          <Input id="poc-new" type="number" min={0} value={newTotal} onChange={(e) => setNewTotal(e.target.value)} className="w-36" />
        </div>
        <div className="flex-1">
          <Label htmlFor="poc-reason">Alasan</Label>
          <Input id="poc-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <Button onClick={() => { if (newTotal && reason) create.mutate({ newTotal: Number(newTotal), reason }, { onSuccess: () => { setNewTotal(''); setReason(''); } }); }} loading={create.isPending}>
          Buat Change
        </Button>
      </div>
    </div>
  );
}

function RatingForm() {
  const { data: vendors } = useVendors({ page: 1, pageSize: 100 });
  const { data: projects } = useProjects({ page: 1, pageSize: 100 });
  const create = useCreateVendorRating();
  const [vendorId, setVendorId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [category, setCategory] = useState('DELIVERY');
  const [score, setScore] = useState('4');
  const [remark, setRemark] = useState('');
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="vr-vendor">Vendor</Label>
          <select id="vr-vendor" value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Pilih…</option>
            {(vendors?.items ?? []).map((v) => <option key={v.id} value={v.id}>{v.vendorCode} — {v.name}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="vr-project">Project</Label>
          <select id="vr-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">—</option>
            {(projects?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="vr-cat">Kategori</Label>
          <select id="vr-cat" value={category} onChange={(e) => setCategory(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            {['DELIVERY', 'QUALITY', 'COMMERCIAL', 'HSE', 'RESPONSIVENESS'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="vr-score">Skor</Label>
          <select id="vr-score" value={score} onChange={(e) => setScore(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            {['1', '2', '3', '4', '5'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <Label htmlFor="vr-remark">Catatan</Label>
          <Input id="vr-remark" value={remark} onChange={(e) => setRemark(e.target.value)} />
        </div>
        <Button onClick={() => { if (vendorId && score) create.mutate({ vendorId, projectId: projectId || undefined, category, score: Number(score), remark: remark || undefined }, { onSuccess: () => { setVendorId(''); setRemark(''); } }); }} loading={create.isPending}>
          Beri Rating
        </Button>
      </div>
    </div>
  );
}
