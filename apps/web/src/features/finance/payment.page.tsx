import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid, Input, Label } from '@aec/ui';
import { useProjects } from '@/features/project/project.api';
import { useVendorInvoices } from './finance.api';
import { useCreatePayment, useApprovePayment, usePayPayment, usePayments, type Payment } from './finance.api';

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

type PayLine = { invoiceId: string; amount: number };

function PaymentForm({ onDone }: { onDone: () => void }) {
  const [projectId, setProjectId] = useState('');
  const [vendor, setVendor] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [reference, setReference] = useState('');
  const [lines, setLines] = useState<PayLine[]>([]);

  const projects = useProjects({ page: 1, pageSize: 100 });
  const invoices = useVendorInvoices({ page: 1, pageSize: 100 });
  const postedInvoices = (invoices.data?.items ?? []).filter((inv) => inv.status === 'POSTED');
  const create = useCreatePayment();

  const addLine = (invoiceId: string) => {
    const invoice = postedInvoices.find((inv) => inv.id === invoiceId);
    setLines((prev) => [...prev, { invoiceId, amount: Number(invoice?.totalAmount ?? 0) }]);
  };

  const updateLine = (index: number, patch: Partial<PayLine>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const onSubmit = () => {
    if (!projectId || !vendor) return;
    const items = lines
      .filter((l) => l.amount > 0)
      .map((l) => ({ invoiceId: l.invoiceId, amount: l.amount }));
    if (items.length === 0) return;
    create.mutate(
      { projectId, vendor, bankAccount: bankAccount || undefined, reference: reference || undefined, items },
      {
        onSuccess: () => {
          setVendor('');
          setBankAccount('');
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
          <Label htmlFor="pay-project">Project</Label>
          <select
            id="pay-project"
            value={projectId}
            onChange={(e) => { setProjectId(e.target.value); setLines([]); }}
            className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="">Pilih project…</option>
            {(projects.data?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="pay-vendor">Vendor</Label>
          <Input id="pay-vendor" placeholder="PT Baja Utama" value={vendor} onChange={(e) => setVendor(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="pay-bank">Rekening (opsional)</Label>
          <Input id="pay-bank" placeholder="No. rekening" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="pay-ref">Referensi (opsional)</Label>
          <Input id="pay-ref" placeholder="No. transfer" value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-neutral-200">
        <table className="w-full text-left text-body">
          <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-2">Invoice POSTED</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-right">Bayar</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {postedInvoices.map((inv) => {
              const line = lines.find((l) => l.invoiceId === inv.id);
              const added = !!line;
              return (
                <tr key={inv.id} className="border-t border-neutral-100">
                  <td className="px-3 py-2 font-mono text-neutral-700">{inv.invoiceNumber}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-neutral-600">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(inv.totalAmount)}
                  </td>
                  <td className="px-3 py-2">
                    {added ? (
                      <Input type="number" min={0} step={1000} value={line?.amount || ''} onChange={(e) => updateLine(lines.indexOf(line!), { amount: Number(e.target.value) })} className="h-8 w-32 text-right" />
                    ) : (
                      <span className="text-caption text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {added
                      ? <Button type="button" variant="ghost" size="sm" onClick={() => setLines((prev) => prev.filter((_, i) => i !== lines.indexOf(line!)))}>Batal</Button>
                      : <Button type="button" variant="secondary" size="sm" onClick={() => addLine(inv.id)}>+ Pilih</Button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {postedInvoices.length === 0 && <p className="p-3 text-caption text-neutral-500">Tidak ada invoice POSTED.</p>}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="button" onClick={onSubmit} loading={create.isPending}>Buat Payment DRAFT</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal. Jumlah tidak boleh melebihi AP open.</p>}
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
