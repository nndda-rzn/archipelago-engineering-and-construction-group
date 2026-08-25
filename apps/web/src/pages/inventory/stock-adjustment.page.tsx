import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid, Input, Label } from '@aec/ui';
import { useProjects } from '@/features/project/project.api';
import { useWarehouses, useCreateStockAdjustment, useApproveStockAdjustment, useStockAdjustments, type StockAdjustment } from '@/features/inventory/inventory.api';

const PAGE_SIZE = 20;

const statusVariant: Record<string, 'default' | 'success' | 'warning'> = {
  DRAFT: 'warning',
  APPROVED: 'success',
  REJECTED: 'default',
  CANCELLED: 'default',
};

const columnHelper = createColumnHelper<StockAdjustment>();

const columns = [
  columnHelper.accessor('adjustmentNumber', {
    header: 'Nomor',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  columnHelper.accessor('warehouse', {
    header: 'Warehouse',
    cell: (info) => <span className="text-neutral-700">{info.getValue()?.code ?? '-'}</span>,
  }),
  columnHelper.accessor('reasonCode', {
    header: 'Alasan',
    cell: (info) => <Badge variant={info.getValue() === 'SURPLUS' ? 'success' : 'default'}>{info.getValue()}</Badge>,
  }),
  columnHelper.accessor('items', {
    header: 'Item',
    cell: (info) => <span className="tabular-nums text-neutral-600">{info.getValue().length} baris</span>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <ApproveButton adj={row.original} />,
  }),
];

function ApproveButton({ adj }: { adj: StockAdjustment }) {
  const approve = useApproveStockAdjustment();
  if (adj.status !== 'DRAFT') return null;
  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={() => {
        if (window.confirm(`Approve adjustment ${adj.adjustmentNumber}? Stok akan ter-update.`)) approve.mutate(adj.id);
      }}
      loading={approve.isPending}
    >
      Approve
    </Button>
  );
}

type AdjLine = { description: string; quantity: number; unit: string };

function AdjustmentForm({ onDone }: { onDone: () => void }) {
  const [projectId, setProjectId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [reasonCode, setReasonCode] = useState('LOSS');
  const [lines, setLines] = useState<AdjLine[]>([{ description: '', quantity: 0, unit: 'EA' }]);

  const projects = useProjects({ page: 1, pageSize: 100 });
  const warehouses = useWarehouses({ page: 1, pageSize: 100 });
  const create = useCreateStockAdjustment();

  const projectWhs = (warehouses.data?.items ?? []).filter((w) => w.projectId === projectId || (w.warehouseType === 'CORPORATE' && !w.projectId));

  const updateLine = (index: number, patch: Partial<AdjLine>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const onSubmit = () => {
    if (!projectId || !warehouseId) return;
    const items = lines
      .filter((l) => l.description && l.quantity !== 0)
      .map((l) => ({ description: l.description, quantity: l.quantity, unit: l.unit }));
    if (items.length === 0) return;
    create.mutate(
      { projectId, warehouseId, reasonCode, items },
      {
        onSuccess: () => {
          setLines([{ description: '', quantity: 0, unit: 'EA' }]);
          onDone();
        },
      },
    );
  };

  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="adj-project">Project</Label>
          <select id="adj-project" value={projectId} onChange={(e) => { setProjectId(e.target.value); setWarehouseId(''); }} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20">
            <option value="">Pilih project…</option>
            {(projects.data?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="adj-wh">Warehouse</Label>
          <select id="adj-wh" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20">
            <option value="">Pilih…</option>
            {projectWhs.map((w) => <option key={w.id} value={w.id}>{w.code}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="adj-reason">Alasan</Label>
          <select id="adj-reason" value={reasonCode} onChange={(e) => setReasonCode(e.target.value)} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20">
            <option value="LOSS">LOSS</option>
            <option value="DAMAGE">DAMAGE</option>
            <option value="SURPLUS">SURPLUS</option>
            <option value="REVALUATION">REVALUATION</option>
            <option value="OTHERS">OTHERS</option>
          </select>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-neutral-200">
        <table className="w-full text-left text-body">
          <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-2">Deskripsi</th>
              <th className="px-3 py-2">Unit</th>
              <th className="px-3 py-2 text-right">Delta Qty (+/-)</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={index} className="border-t border-neutral-100">
                <td className="px-3 py-2"><Input placeholder="Deskripsi" value={line.description} onChange={(e) => updateLine(index, { description: e.target.value })} className="h-8" /></td>
                <td className="px-3 py-2"><Input placeholder="EA" value={line.unit} onChange={(e) => updateLine(index, { unit: e.target.value })} className="h-8 w-20" /></td>
                <td className="px-3 py-2">
                  <Input type="number" step={1} placeholder="0" value={line.quantity || ''} onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })} className="h-8 w-28" />
                </td>
                <td className="px-3 py-2 text-right">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))} disabled={lines.length === 1}>Hapus</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => setLines((prev) => [...prev, { description: '', quantity: 0, unit: 'EA' }])}>+ Tambah Baris</Button>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="button" onClick={onSubmit} loading={create.isPending}>Buat DRAFT</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal buat adjustment.</p>}
    </div>
  );
}

export function StockAdjustmentPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, isError, refetch } = useStockAdjustments({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Stock Adjustment</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Penyesuaian stok — wajib approval + reason code (FR-INV-006)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Tutup' : '+ Buat Adjustment'}
        </Button>
      </div>

      {showForm && <AdjustmentForm onDone={() => setShowForm(false)} />}

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        <DataGrid
          columns={columns}
          data={data?.items ?? []}
          rowCount={data?.total ?? 0}
          pagination={pagination}
          onPaginationChange={setPagination}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          emptyMessage="Belum ada stock adjustment"
        />
      </div>
    </div>
  );
}
