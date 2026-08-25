import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid, Input, Label } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useClientInvoices, useCollections, useCreateCollection, usePostCollection, type Collection } from '@/features/finance';

const PAGE_SIZE = 20;

const statusVariant: Record<string, 'default' | 'success' | 'warning'> = {
  DRAFT: 'default',
  POSTED: 'success',
  CANCELLED: 'warning',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const columnHelper = createColumnHelper<Collection>();

const columns = [
  columnHelper.accessor('collectionNumber', {
    header: 'No. Collection',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  columnHelper.accessor('client', {
    header: 'Klien',
    cell: (info) => <span className="text-neutral-700">{info.getValue()}</span>,
  }),
  columnHelper.accessor('totalAmount', {
    header: 'Total',
    cell: (info) => <span className="font-mono tabular-nums text-neutral-700">{fmt(info.getValue())}</span>,
  }),
  columnHelper.accessor('reference', {
    header: 'Referensi',
    cell: (info) => <span className="font-mono text-neutral-600">{info.getValue() ?? '-'}</span>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <PostButton collection={row.original} />,
  }),
];

function PostButton({ collection }: { collection: Collection }) {
  const post = usePostCollection();
  if (collection.status !== 'DRAFT') return null;
  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={() => {
        if (window.confirm(`Posting ${collection.collectionNumber}? Auto-GL: Dr Kas, Cr Piutang.`)) post.mutate(collection.id);
      }}
      loading={post.isPending}
    >
      Posting
    </Button>
  );
}

type ColLine = { clientInvoiceId: string; amount: number };

function CollectionForm({ onDone }: { onDone: () => void }) {
  const [projectId, setProjectId] = useState('');
  const [client, setClient] = useState('');
  const [reference, setReference] = useState('');
  const [lines, setLines] = useState<ColLine[]>([]);

  const projects = useProjects({ page: 1, pageSize: 100 });
  const invoices = useClientInvoices({ page: 1, pageSize: 100 });
  const postedInvoices = (invoices.data?.items ?? []).filter((inv) => inv.status === 'POSTED');
  const create = useCreateCollection();

  const addLine = (clientInvoiceId: string) => {
    const invoice = postedInvoices.find((inv) => inv.id === clientInvoiceId);
    setLines((prev) => [...prev, { clientInvoiceId, amount: Number(invoice?.totalAmount ?? 0) }]);
  };

  const updateLine = (index: number, patch: Partial<ColLine>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const onSubmit = () => {
    if (!projectId || !client) return;
    const items = lines.filter((l) => l.amount > 0).map((l) => ({ clientInvoiceId: l.clientInvoiceId, amount: l.amount }));
    if (items.length === 0) return;
    create.mutate(
      { projectId, client, reference: reference || undefined, items },
      {
        onSuccess: () => {
          setClient('');
          setReference('');
          setLines([]);
          onDone();
        },
      },
    );
  };

  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="col-project">Project</Label>
          <select
            id="col-project"
            value={projectId}
            onChange={(e) => { setProjectId(e.target.value); setLines([]); }}
            className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="">Pilih project…</option>
            {(projects.data?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="col-client">Klien</Label>
          <Input id="col-client" placeholder="PT Klien Utama" value={client} onChange={(e) => setClient(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="col-ref">Referensi (opsional)</Label>
          <Input id="col-ref" placeholder="No. transfer" value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-neutral-200">
        <table className="w-full text-left text-body">
          <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-2">Client Invoice POSTED</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-right">Diterima</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {postedInvoices.map((inv) => {
              const line = lines.find((l) => l.clientInvoiceId === inv.id);
              return (
                <tr key={inv.id} className="border-t border-neutral-100">
                  <td className="px-3 py-2 font-mono text-neutral-700">{inv.invoiceNumber}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-neutral-600">{fmt(inv.totalAmount)}</td>
                  <td className="px-3 py-2">
                    {line ? (
                      <Input type="number" min={0} step={100000} value={line.amount || ''} onChange={(e) => updateLine(lines.indexOf(line), { amount: Number(e.target.value) })} className="h-8 w-32 text-right" />
                    ) : (
                      <span className="text-caption text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {line
                      ? <Button type="button" variant="ghost" size="sm" onClick={() => setLines((prev) => prev.filter((_, i) => i !== lines.indexOf(line)))}>Batal</Button>
                      : <Button type="button" variant="secondary" size="sm" onClick={() => addLine(inv.id)}>+ Pilih</Button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {postedInvoices.length === 0 && <p className="p-3 text-caption text-neutral-500">Tidak ada client invoice POSTED.</p>}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="button" onClick={onSubmit} loading={create.isPending}>Buat Collection DRAFT</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal. Jumlah tidak boleh melebihi sisa piutang.</p>}
    </div>
  );
}

export function CollectionPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading, isError, refetch } = useCollections({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Collection</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Terima pembayaran dari klien — kurangi AR (FR-FIN-010)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Tutup' : '+ Buat Collection'}
        </Button>
      </div>

      {showForm && <CollectionForm onDone={() => setShowForm(false)} />}

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
          emptyMessage="Belum ada collection"
        />
      </div>
    </div>
  );
}
