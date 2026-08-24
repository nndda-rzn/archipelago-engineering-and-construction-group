import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid, Input, Label } from '@aec/ui';
import { useClientInvoices, useCreateClientInvoice, usePostClientInvoice, useProgressClaims, type ClientInvoice } from './finance.api';

const PAGE_SIZE = 20;

const statusVariant: Record<string, 'default' | 'success' | 'warning'> = {
  DRAFT: 'default',
  POSTED: 'success',
  PAID: 'success',
  CANCELLED: 'warning',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const columnHelper = createColumnHelper<ClientInvoice>();

const columns = [
  columnHelper.accessor('invoiceNumber', {
    header: 'No. Invoice',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  columnHelper.accessor('client', {
    header: 'Klien',
    cell: (info) => <span className="text-neutral-700">{info.getValue()}</span>,
  }),
  columnHelper.accessor('claim', {
    header: 'Claim',
    cell: (info) => <span className="font-mono text-neutral-600">{info.getValue()?.claimNumber}</span>,
  }),
  columnHelper.accessor('totalAmount', {
    header: 'Total',
    cell: (info) => <span className="font-mono tabular-nums text-neutral-700">{fmt(info.getValue())}</span>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <PostButton invoice={row.original} />,
  }),
];

function PostButton({ invoice }: { invoice: ClientInvoice }) {
  const post = usePostClientInvoice();
  if (invoice.status !== 'DRAFT') return null;
  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={() => {
        if (window.confirm(`Posting ${invoice.invoiceNumber}? Auto-GL: Dr Piutang, Cr Pendapatan.`)) post.mutate(invoice.id);
      }}
      loading={post.isPending}
    >
      Posting
    </Button>
  );
}

function ClientInvoiceForm({ onDone }: { onDone: () => void }) {
  const [claimId, setClaimId] = useState('');
  const [taxAmount, setTaxAmount] = useState(0);
  const create = useCreateClientInvoice();
  const { data: claims } = useProgressClaims({ page: 1, pageSize: 200 });
  const certifiedClaims = (claims?.items ?? []).filter((c) => c.status === 'CERTIFIED');

  const onSubmit = () => {
    if (!claimId) return;
    create.mutate(
      { claimId, taxAmount: taxAmount || undefined },
      { onSuccess: () => { setClaimId(''); setTaxAmount(0); onDone(); } },
    );
  };

  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cinv-claim">Claim CERTIFIED</Label>
          <select
            id="cinv-claim"
            value={claimId}
            onChange={(e) => setClaimId(e.target.value)}
            className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="">Pilih claim…</option>
            {certifiedClaims.map((c) => (
              <option key={c.id} value={c.id}>
                {c.claimNumber} — {fmt(Number(c.certifiedAmount ?? c.amount))}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="cinv-tax">PPN Keluaran</Label>
          <Input id="cinv-tax" type="number" min={0} step={100000} value={taxAmount || ''} onChange={(e) => setTaxAmount(Number(e.target.value))} placeholder="0" />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="button" onClick={onSubmit} loading={create.isPending}>Buat Invoice</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Claim harus CERTIFIED & belum di-invoice.</p>}
      {claims && claims.items.length === 0 && (
        <p className="mt-3 text-caption text-neutral-500">Belum ada claim CERTIFIED.</p>
      )}
    </div>
  );
}

export function ClientInvoicePage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading, isError, refetch } = useClientInvoices({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Client Invoice</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Faktur AR ke klien dari claim CERTIFIED (FR-FIN-009)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Tutup' : '+ Buat Invoice'}
        </Button>
      </div>

      {showForm && <ClientInvoiceForm onDone={() => setShowForm(false)} />}

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
          emptyMessage="Belum ada client invoice"
        />
      </div>
    </div>
  );
}
