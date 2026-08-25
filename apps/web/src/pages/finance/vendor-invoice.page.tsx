import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid } from '@aec/ui';
import { usePostVendorInvoice, useVendorInvoices, type VendorInvoice } from '@/features/finance/finance.api';
import { InvoiceForm } from '@/features/finance/vendor-invoice-form';

const PAGE_SIZE = 20;

const statusVariant: Record<string, 'default' | 'success' | 'warning'> = {
  DRAFT: 'default',
  MATCHED: 'success',
  POSTED: 'warning',
  REJECTED: 'default',
  CANCELLED: 'default',
};

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
    cell: (info) => <span className="font-mono text-neutral-600">{info.getValue()?.poNumber ?? '-'}</span>,
  }),
  columnHelper.accessor('totalAmount', {
    header: 'Total',
    cell: (info) => (
      <span className="font-mono tabular-nums text-neutral-700">
        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
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
    <Button
      size="sm"
      variant="secondary"
      onClick={() => {
        if (window.confirm(`Post ${inv.invoiceNumber}? Terkunci (BR-001), tidak bisa diedit.`)) post.mutate(inv.id);
      }}
      loading={post.isPending}
    >
      Post AP
    </Button>
  );
}

export function VendorInvoicePage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, isError, refetch } = useVendorInvoices({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Vendor Invoice</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Invoice berbasis PO — three-way match PO + GR + Invoice (FR-PRO-009)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Tutup' : '+ Buat Invoice'}
        </Button>
      </div>

      {showForm && <InvoiceForm onDone={() => setShowForm(false)} />}

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
          emptyMessage="Belum ada vendor invoice"
        />
      </div>
    </div>
  );
}
