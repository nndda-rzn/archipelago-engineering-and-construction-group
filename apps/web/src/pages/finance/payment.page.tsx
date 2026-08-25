import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid } from '@aec/ui';
import { useApprovePayment, usePayPayment, usePayments, type Payment } from '@/features/finance/finance.api';
import { PaymentForm } from '@/features/finance/payment-form';

const PAGE_SIZE = 20;

const statusVariant: Record<string, 'default' | 'success' | 'warning'> = {
  DRAFT: 'default',
  APPROVED: 'warning',
  PAID: 'success',
  CANCELLED: 'default',
}; 

const columnHelper = createColumnHelper<Payment>();

const columns = [
  columnHelper.accessor('paymentNumber', {
    header: 'Nomor',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  columnHelper.accessor('vendor', {
    header: 'Vendor',
    cell: (info) => <span className="text-neutral-700">{info.getValue()}</span>,
  }),
  columnHelper.accessor('totalAmount', {
    header: 'Total',
    cell: (info) => (
      <span className="font-mono tabular-nums text-neutral-700">
        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(info.getValue())}
      </span>
    ),
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
    cell: ({ row }) => <ActionButtons payment={row.original} />,
  }),
];

function ActionButtons({ payment }: { payment: Payment }) {
  const approve = useApprovePayment();
  const pay = usePayPayment();

  return (
    <div className="flex gap-2">
      {payment.status === 'DRAFT' && (
        <Button size="sm" variant="secondary" onClick={() => approve.mutate(payment.id)} loading={approve.isPending}>
          Approve
        </Button>
      )}
      {payment.status === 'APPROVED' && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            if (window.confirm(`Bayar ${payment.paymentNumber}? AP terkurangi.`)) pay.mutate(payment.id);
          }}
          loading={pay.isPending}
        >
          Bayar
        </Button>
      )}
    </div>
  );
}

export function PaymentPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, isError, refetch } = usePayments({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Payment / AP</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Bayar vendor — kurangi AP (FR-FIN-005/007)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Tutup' : '+ Buat Payment'}
        </Button>
      </div>

      {showForm && <PaymentForm onDone={() => setShowForm(false)} />}

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
          emptyMessage="Belum ada payment"
        />
      </div>
    </div>
  );
}
