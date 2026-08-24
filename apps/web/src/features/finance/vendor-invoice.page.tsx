import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid, Input, Label } from '@aec/ui';
import { usePos, type PurchaseOrder } from '@/features/procurement/procurement.api';
import { useCreateVendorInvoice, usePostVendorInvoice, useVendorInvoices, type VendorInvoice } from './finance.api';

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

type InvoiceLine = { poItemId: string; quantity: number; unitPrice: number };

function InvoiceForm({ onDone }: { onDone: () => void }) {
  const [poId, setPoId] = useState('');
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState('');
  const [taxAmount, setTaxAmount] = useState('');
  const [lines, setLines] = useState<InvoiceLine[]>([]);

  const pos = usePos({ page: 1, pageSize: 100 });
  const releasedPos = (pos.data?.items ?? []).filter((po) => po.status === 'RELEASED');
  const create = useCreateVendorInvoice();

  const selectedPo = releasedPos.find((po) => po.id === poId);

  const addLine = (poItemId: string) => {
    setLines((prev) => [...prev, { poItemId, quantity: 0, unitPrice: 0 }]);
  };

  const updateLine = (index: number, patch: Partial<InvoiceLine>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const onSubmit = () => {
    if (!poId || !vendorInvoiceNo) return;
    const items = lines
      .filter((l) => l.quantity > 0)
      .map((l) => ({ poItemId: l.poItemId, quantity: l.quantity, unitPrice: l.unitPrice }));
    if (items.length === 0) return;
    create.mutate(
      {
        poId,
        vendorInvoiceNo,
        taxAmount: taxAmount ? Number(taxAmount) : undefined,
        items,
      },
      {
        onSuccess: () => {
          setVendorInvoiceNo('');
          setTaxAmount('');
          setLines([]);
          onDone();
        },
      },
    );
  };

  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="inv-po">PO (harus RELEASED)</Label>
          <select
            id="inv-po"
            value={poId}
            onChange={(e) => { setPoId(e.target.value); setLines([]); }}
            className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="">Pilih PO…</option>
            {releasedPos.map((po) => <option key={po.id} value={po.id}>{po.poNumber} — {po.vendor}</option>)}
          </select>
          {releasedPos.length === 0 && <p className="mt-1 text-caption text-neutral-500">Tidak ada PO RELEASED.</p>}
        </div>
        <div>
          <Label htmlFor="inv-no">No. Invoice Vendor</Label>
          <Input id="inv-no" placeholder="V-2026-001" value={vendorInvoiceNo} onChange={(e) => setVendorInvoiceNo(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="inv-tax">Pajak (opsional)</Label>
          <Input id="inv-tax" type="number" placeholder="0" value={taxAmount} onChange={(e) => setTaxAmount(e.target.value)} />
        </div>
      </div>

      {selectedPo && (
        <div className="mt-4 overflow-hidden rounded-md border border-neutral-200">
          <table className="w-full text-left text-body">
            <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-3 py-2">Item PO</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Unit Price</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {selectedPo.items.map((item) => {
                const line = lines.find((l) => l.poItemId === item.id);
                const added = !!line;
                return (
                  <tr key={item.id} className="border-t border-neutral-100">
                    <td className="px-3 py-2 text-neutral-700">{item.description} <span className="text-caption text-neutral-500">(qty PO {item.quantity} {item.unit})</span></td>
                    <td className="px-3 py-2">
                      {added ? (
                        <Input type="number" min={0} step={1} value={line?.quantity || ''} onChange={(e) => updateLine(lines.indexOf(line!), { quantity: Number(e.target.value) })} className="h-8 w-24 text-right" />
                      ) : (
                        <span className="text-caption text-neutral-400">belum dipilih</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {added && (
                        <Input type="number" min={0} step={1000} value={line?.unitPrice || ''} onChange={(e) => updateLine(lines.indexOf(line!), { unitPrice: Number(e.target.value) })} className="h-8 w-28 text-right" />
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {added
                        ? <Button type="button" variant="ghost" size="sm" onClick={() => setLines((prev) => prev.filter((_, i) => i !== lines.indexOf(line!)))}>Batal</Button>
                        : <Button type="button" variant="secondary" size="sm" onClick={() => addLine(item.id)}>+ Pilih</Button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="button" onClick={onSubmit} loading={create.isPending}>Buat Invoice</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal. Qty invoice tidak boleh melebihi qty diterima (3-way match).</p>}
    </div>
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

export type { PurchaseOrder };
