import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid, Input, Label } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useWarehouses, useCreateStockOpname, useStockOpnames, type StockOpname } from '@/features/inventory';

const PAGE_SIZE = 20;

const statusVariant: Record<string, 'default' | 'info' | 'success'> = {
  DRAFT: 'default',
  IN_PROGRESS: 'info',
  RECONCILED: 'success',
  CLOSED: 'success',
};

const columnHelper = createColumnHelper<StockOpname>();

const columns = [
  columnHelper.accessor('opnameNumber', {
    header: 'Nomor',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  columnHelper.accessor('warehouse', {
    header: 'Warehouse',
    cell: (info) => <span className="text-neutral-700">{info.getValue()?.code ?? '-'}</span>,
  }),
  columnHelper.accessor('countedBy', {
    header: 'Pencatat',
    cell: (info) => <span className="text-neutral-600">{info.getValue()}</span>,
  }),
  columnHelper.accessor('items', {
    header: 'Item',
    cell: (info) => <span className="tabular-nums text-neutral-600">{info.getValue().length} baris</span>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  columnHelper.accessor('items', {
    id: 'diff',
    header: 'Selisih',
    cell: (info) => {
      const diffs = info.getValue().filter((i) => i.difference !== 0).length;
      return diffs > 0
        ? <Badge variant="warning">{diffs} item beda</Badge>
        : <Badge variant="success">Sesuai</Badge>;
    },
  }),
];

type OpnLine = { description: string; actualQuantity: number; unit: string };

function OpnameForm({ onDone }: { onDone: () => void }) {
  const [projectId, setProjectId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [lines, setLines] = useState<OpnLine[]>([{ description: '', actualQuantity: 0, unit: 'EA' }]);

  const projects = useProjects({ page: 1, pageSize: 100 });
  const warehouses = useWarehouses({ page: 1, pageSize: 100 });
  const create = useCreateStockOpname();

  const projectWhs = (warehouses.data?.items ?? []).filter((w) => w.projectId === projectId || (w.warehouseType === 'CORPORATE' && !w.projectId));

  const updateLine = (index: number, patch: Partial<OpnLine>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const onSubmit = () => {
    if (!projectId || !warehouseId) return;
    const items = lines
      .filter((l) => l.description)
      .map((l) => ({ description: l.description, bookQuantity: 0, actualQuantity: l.actualQuantity, unit: l.unit }));
    if (items.length === 0) return;
    create.mutate(
      { projectId, warehouseId, remark: undefined, items },
      {
        onSuccess: () => {
          setLines([{ description: '', actualQuantity: 0, unit: 'EA' }]);
          onDone();
        },
      },
    );
  };

  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="opn-project">Project</Label>
          <select id="opn-project" value={projectId} onChange={(e) => { setProjectId(e.target.value); setWarehouseId(''); }} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20">
            <option value="">Pilih project…</option>
            {(projects.data?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="opn-wh">Warehouse</Label>
          <select id="opn-wh" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20">
            <option value="">Pilih…</option>
            {projectWhs.map((w) => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-neutral-200">
        <table className="w-full text-left text-body">
          <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-2">Deskripsi</th>
              <th className="px-3 py-2">Unit</th>
              <th className="px-3 py-2 text-right">Qty Fisik</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={index} className="border-t border-neutral-100">
                <td className="px-3 py-2"><Input placeholder="Deskripsi (stok book dihitung sistem)" value={line.description} onChange={(e) => updateLine(index, { description: e.target.value })} className="h-8" /></td>
                <td className="px-3 py-2"><Input placeholder="EA" value={line.unit} onChange={(e) => updateLine(index, { unit: e.target.value })} className="h-8 w-20" /></td>
                <td className="px-3 py-2">
                  <Input type="number" min={0} step={1} placeholder="0" value={line.actualQuantity || ''} onChange={(e) => updateLine(index, { actualQuantity: Number(e.target.value) })} className="h-8 w-28" />
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
        <Button type="button" variant="secondary" size="sm" onClick={() => setLines((prev) => [...prev, { description: '', actualQuantity: 0, unit: 'EA' }])}>+ Tambah Baris</Button>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="button" onClick={onSubmit} loading={create.isPending}>Catat Opname</Button>
      </div>
      <p className="mt-2 text-caption text-neutral-500">Selisih opname otomatis membuat Stock Adjustment DRAFT (perlu approve di halaman Adjustment).</p>
    </div>
  );
}

export function StockOpnamePage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, isError, refetch } = useStockOpnames({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Stock Opname</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Count sheet + reconciliation (FR-INV-007)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Tutup' : '+ Mulai Opname'}
        </Button>
      </div>

      {showForm && <OpnameForm onDone={() => setShowForm(false)} />}

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
          emptyMessage="Belum ada stock opname"
        />
      </div>
    </div>
  );
}
