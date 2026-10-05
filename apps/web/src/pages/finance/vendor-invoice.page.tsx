import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Button, ConfirmActionButton, DataGrid, EmptyCell, StatusBadge } from '@aec/ui';
import { usePostVendorInvoice, useVendorInvoices, type VendorInvoice } from '@/features/finance';
import { InvoiceForm } from '@/features/finance';
import { formatIdr } from '@/shared/lib/format';
import { PAGE_SIZE } from '@/shared/lib/pagination';
import { useUrlPagination } from '@/shared/lib/use-url-state';

const columnHelper = createColumnHelper<VendorInvoice>();

const columns = [
  columnHelper.accessor('invoiceNumber', {
    header: 'Nomor Invoice',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  columnHelper.accessor('vendor', {
    header: 'Vendor',
    cell: (info) => <span className="text-neutral-700">{info.getValue()}</span>,
  }),
  columnHelper.accessor('po', {
    header: 'PO',
    cell: (info) => <span className="font-mono text-neutral-600">{info.getValue()?.poNumber ?? <EmptyCell />}</span>,
  }),
  columnHelper.accessor('totalAmount', {
    header: 'Total',
    cell: (info) => (
      <span className="font-mono tabular-nums text-neutral-700">
        {formatIdr(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <PostButton inv={row.original} />,
  }),
];

function PostButton({ inv }: { inv: VendorInvoice }) {
  const post = usePostVendorInvoice();
  if (inv.status !== 'MATCHED') return null;
  return (
    <ConfirmActionButton
      size="sm"
      variant="secondary"
      confirmTitle="Post AP"
      confirmDescription={`Post ${inv.invoiceNumber}? Terkunci (BR-001), tidak bisa diedit.`}
      confirmLabel="Post AP"
      onConfirm={() => post.mutate(inv.id)}
      loading={post.isPending}
    >
      Post AP
    </ConfirmActionButton>
  );
}

export function VendorInvoicePage() {
  const [showForm, setShowForm] = useState(false);
  const { pagination, onPaginationChange } = useUrlPagination(PAGE_SIZE);

  const { data, isLoading, isError, refetch } = useVendorInvoices({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Vendor Invoice</h1>
          <p className="mt-1 text-body-sm text-neutral-500">PO-based invoice · three-way match PO + GR + Invoice (FR-PRO-009)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Close' : '+ Create Invoice'}
        </Button>
      </div>

      {showForm && <InvoiceForm onDone={() => setShowForm(false)} />}

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        <DataGrid
          columns={columns}
          data={data?.items ?? []}
          rowCount={data?.total ?? 0}
          pagination={pagination}
          onPaginationChange={onPaginationChange}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          emptyMessage="No vendor invoices yet"
        />
      </div>
    </div>
  );
}
