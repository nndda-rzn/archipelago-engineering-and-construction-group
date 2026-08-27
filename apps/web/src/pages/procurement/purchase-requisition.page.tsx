import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid, EmptyCell, Input, Label } from '@aec/ui';
import { Plus, Trash2 } from 'lucide-react';
import { useCreatePr, usePrs, type PurchaseRequisition } from '@/features/procurement';
import { useProjects } from '@/entities/project';
import { useWbsTree } from '@/entities/wbs';
import { useSubmitForApproval } from '@/features/approval';

const PAGE_SIZE = 20;

const statusVariant: Record<string, 'default' | 'info' | 'success' | 'destructive' | 'muted'> = {
  DRAFT: 'default',
  SUBMITTED: 'info',
  APPROVED: 'success',
  REJECTED: 'destructive',
  CANCELLED: 'muted',
};

const columnHelper = createColumnHelper<PurchaseRequisition>();

const columns = [
  columnHelper.accessor('prNumber', {
    header: 'Nomor PR',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  columnHelper.accessor('project', {
    header: 'Project',
    cell: (info) => <span className="text-neutral-700">{info.getValue()?.code ?? <EmptyCell />}</span>,
  }),
  columnHelper.accessor('requestedBy', {
    header: 'Diminta Oleh',
    cell: (info) => <span className="text-neutral-600">{info.getValue()}</span>,
  }),
  columnHelper.accessor('items', {
    header: 'Item',
    cell: (info) => <span className="text-neutral-600">{info.getValue().length} item</span>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <SubmitButton pr={row.original} />,
  }),
];

function SubmitButton({ pr }: { pr: PurchaseRequisition }) {
  const submit = useSubmitForApproval();
  if (pr.status !== 'DRAFT') return null;
  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={() => {
        if (window.confirm(`Ajukan ${pr.prNumber} untuk approval?`)) {
          submit.mutate({
            transactionType: 'PurchaseRequisition',
            transactionId: pr.id,
            transactionCode: pr.prNumber,
            approverRoleCode: 'PROCUREMENT_MANAGER',
          });
        }
      }}
      loading={submit.isPending}
    >
      Ajukan Approval
    </Button>
  );
}

type FormItem = { description: string; quantity: string; unit: string; estimatedUnitPrice: string };

export function PurchaseRequisitionPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [projectId, setProjectId] = useState('');
  const [wbsItemId, setWbsItemId] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [items, setItems] = useState<FormItem[]>([{ description: '', quantity: '1', unit: 'EA', estimatedUnitPrice: '' }]);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, isError, refetch } = usePrs({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const create = useCreatePr();
  const projects = useProjects({ page: 1, pageSize: 100 });
  const { data: wbsTree } = useWbsTree(projectId);

  const updateItem = (idx: number, field: keyof FormItem, value: string) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const onSubmit = () => {
    const validItems = items.filter((i) => i.description.trim()).map((i) => ({
      description: i.description.trim(),
      quantity: Number(i.quantity) || 1,
      unit: i.unit || 'EA',
      estimatedUnitPrice: i.estimatedUnitPrice ? Number(i.estimatedUnitPrice) : undefined,
    }));
    if (!projectId || !requestedBy || validItems.length === 0) return;

    create.mutate(
      { projectId, wbsItemId: wbsItemId || undefined, requestedBy, items: validItems },
      {
        onSuccess: () => {
          setItems([{ description: '', quantity: '1', unit: 'EA', estimatedUnitPrice: '' }]);
          setRequestedBy('');
          setShowForm(false);
        },
      },
    );
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Purchase Requisition</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Permintaan pembelian (FR-PRO-001)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Tutup' : '+ Buat PR'}
        </Button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="pr-project">Project</Label>
              <select id="pr-project" value={projectId} onChange={(e) => { setProjectId(e.target.value); setWbsItemId(''); }} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20">
                <option value="">Pilih project…</option>
                {(projects.data?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="pr-wbs">WBS (opsional)</Label>
              <select id="pr-wbs" value={wbsItemId} onChange={(e) => setWbsItemId(e.target.value)} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20" disabled={!projectId}>
                <option value="">—</option>
                {flattenWbs(wbsTree ?? []).map((w) => <option key={w.id} value={w.id}>{w.code} {w.name}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="pr-requested">Diminta Oleh</Label>
              <Input id="pr-requested" placeholder="Nama pemohon" value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)} />
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 text-body-sm font-medium text-neutral-700">Item</div>
            {items.map((item, idx) => (
              <div key={idx} className="mb-2 grid grid-cols-12 gap-2">
                <Input className="col-span-5" placeholder="Deskripsi item" value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} />
                <Input className="col-span-2" type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                <Input className="col-span-2" placeholder="Unit" value={item.unit} onChange={(e) => updateItem(idx, 'unit', e.target.value)} />
                <Input className="col-span-2" type="number" placeholder="Est. harga" value={item.estimatedUnitPrice} onChange={(e) => updateItem(idx, 'estimatedUnitPrice', e.target.value)} />
                <Button className="col-span-1" variant="ghost" size="icon" aria-label="Hapus item" onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="secondary" size="sm" onClick={() => setItems((p) => [...p, { description: '', quantity: '1', unit: 'EA', estimatedUnitPrice: '' }])}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Tambah Item
            </Button>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Batal</Button>
            <Button type="button" onClick={onSubmit} loading={create.isPending}>Simpan PR</Button>
          </div>
          {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal membuat PR.</p>}
        </div>
      )}

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
          emptyMessage="Belum ada PR"
        />
      </div>
    </div>
  );
}

function flattenWbs(nodes: { id: string; code: string; name: string; children: unknown[] }[]): { id: string; code: string; name: string }[] {
  const out: { id: string; code: string; name: string }[] = [];
  for (const n of nodes) {
    out.push({ id: n.id, code: n.code, name: n.name });
    out.push(...flattenWbs(n.children as never));
  }
  return out;
}
