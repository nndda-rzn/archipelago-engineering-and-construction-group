import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Button, ConfirmActionButton, DataGrid, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, StatusBadge } from '@aec/ui';
import { useClientInvoices, useCreateClientInvoice, usePostClientInvoice, useProgressClaims, type ClientInvoice } from '@/features/finance';
import { formatIdr as fmt } from '@/shared/lib/format';
import { PAGE_SIZE } from '@/shared/lib/pagination';

const columnHelper = createColumnHelper<ClientInvoice>();

const columns = [
  columnHelper.accessor('invoiceNumber', {
    header: 'Invoice No.',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  columnHelper.accessor('client', {
    header: 'Client',
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
    cell: (info) => <StatusBadge status={info.getValue()} />,
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
    <ConfirmActionButton
      size="sm"
      variant="secondary"
      confirmTitle="Post invoice"
      confirmDescription={`Post ${invoice.invoiceNumber}? Auto-GL: Dr Receivable, Cr Revenue.`}
      confirmLabel="Post"
      onConfirm={() => post.mutate(invoice.id)}
      loading={post.isPending}
    >
      Post
    </ConfirmActionButton>
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="cinv-claim">Claim CERTIFIED</Label>
          <Select value={claimId} onValueChange={setClaimId}>
            <SelectTrigger id="cinv-claim"><SelectValue placeholder="Select claim…" /></SelectTrigger>
            <SelectContent>
              {certifiedClaims.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.claimNumber} · {fmt(Number(c.certifiedAmount ?? c.amount))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="cinv-tax">Output VAT</Label>
          <Input id="cinv-tax" type="number" min={0} step={100000} value={taxAmount || ''} onChange={(e) => setTaxAmount(Number(e.target.value))} placeholder="0" />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="button" onClick={onSubmit} loading={create.isPending}>Create Invoice</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">The claim must be CERTIFIED and not yet invoiced.</p>}
      {claims && claims.items.length === 0 && (
        <p className="mt-3 text-caption text-neutral-500">No CERTIFIED claims yet.</p>
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
          <p className="mt-1 text-body-sm text-neutral-500">AR invoice to client from a CERTIFIED claim (FR-FIN-009)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Close' : '+ Create Invoice'}
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
          emptyMessage="No client invoices yet"
        />
      </div>
    </div>
  );
}
