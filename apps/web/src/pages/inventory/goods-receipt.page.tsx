import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid, Input, Label } from '@aec/ui';
import { usePos, type PurchaseOrder } from '@/features/procurement/procurement.api';
import { useGoodsReceipts, useCreateGoodsReceipt, useWarehouses, type GoodsReceipt } from '@/features/inventory/inventory.api';

const PAGE_SIZE = 20;

const columnHelper = createColumnHelper<GoodsReceipt>();

const columns = [
  columnHelper.accessor('grNumber', {
    header: 'Nomor GR',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  columnHelper.accessor('po', {
    header: 'Dari PO',
    cell: (info) => <span className="font-mono text-neutral-700">{info.getValue()?.poNumber ?? '-'}</span>,
  }),
  columnHelper.accessor('warehouse', {
    header: 'Warehouse',
    cell: (info) => <span className="text-neutral-700">{info.getValue()?.code ?? '-'}</span>,
  }),
  columnHelper.accessor('items', {
    header: 'Item',
    cell: (info) => <span className="tabular-nums text-neutral-600">{info.getValue().length} baris</span>,
  }),
  columnHelper.accessor('receivedBy', {
    header: 'Diterima Oleh',
    cell: (info) => <span className="text-neutral-600">{info.getValue()}</span>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={info.getValue() === 'POSTED' ? 'success' : 'default'}>{info.getValue()}</Badge>,
  }),
  columnHelper.accessor('createdAt', {
    header: 'Tanggal',
    cell: (info) => <span className="tabular-nums text-neutral-500">{new Date(info.getValue()).toLocaleDateString('id-ID')}</span>,
  }),
];

type QtyMap = Record<string, number>;

function ReceiptForm({ onDone }: { onDone: () => void }) {
  const [poId, setPoId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [remark, setRemark] = useState('');
  const [qty, setQty] = useState<QtyMap>({});

  const pos = usePos({ page: 1, pageSize: 100 });
  const releasedPos = (pos.data?.items ?? []).filter((po) => po.status === 'RELEASED');
  const warehouses = useWarehouses({ page: 1, pageSize: 100 });
  const create = useCreateGoodsReceipt();

  const selectedPo = releasedPos.find((po) => po.id === poId);

  const onSubmit = () => {
    if (!poId || !warehouseId || !selectedPo) return;
    const items = selectedPo.items
      .map((item) => ({ poItemId: item.id, quantity: qty[item.id] ?? 0 }))
      .filter((item) => item.quantity > 0);
    if (items.length === 0) return;
    create.mutate(
      { poId, warehouseId, remark: remark || undefined, items },
      {
        onSuccess: () => {
          setPoId('');
          setWarehouseId('');
          setRemark('');
          setQty({});
          onDone();
        },
      },
    );
  };

  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="gr-po">PO (harus RELEASED)</Label>
          <select id="gr-po" value={poId} onChange={(e) => { setPoId(e.target.value); setQty({}); }} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20">
            <option value="">Pilih PO…</option>
            {releasedPos.map((po) => <option key={po.id} value={po.id}>{po.poNumber} — {po.vendor}</option>)}
          </select>
          {releasedPos.length === 0 && <p className="mt-1 text-caption text-neutral-500">Tidak ada PO RELEASED. Release PO dulu.</p>}
        </div>
        <div>
          <Label htmlFor="gr-wh">Warehouse</Label>
          <select id="gr-wh" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20">
            <option value="">Pilih warehouse…</option>
            {(warehouses.data?.items ?? []).map((wh) => <option key={wh.id} value={wh.id}>{wh.code} — {wh.name}</option>)}
          </select>
        </div>
      </div>

      {selectedPo && (
        <div className="mt-4 overflow-hidden rounded-md border border-neutral-200">
          <table className="w-full text-left text-body">
            <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-3 py-2">Deskripsi</th>
                <th className="px-3 py-2 text-right">Qty PO</th>
                <th className="px-3 py-2">Unit</th>
                <th className="px-3 py-2">Unit Price</th>
                <th className="px-3 py-2">Qty Diterima</th>
              </tr>
            </thead>
            <tbody>
              {selectedPo.items.map((item) => (
                <tr key={item.id} className="border-t border-neutral-100">
                  <td className="px-3 py-2 text-neutral-700">{item.description}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-neutral-700">{item.quantity}</td>
                  <td className="px-3 py-2 text-neutral-600">{item.unit}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-neutral-600">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.unitPrice)}
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min={0}
                      max={item.quantity}
                      step={1}
                      placeholder="0"
                      value={qty[item.id] ?? ''}
                      onChange={(e) => setQty((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))}
                      className="h-8 w-28"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4">
        <Label htmlFor="gr-remark">Remark</Label>
        <Input id="gr-remark" placeholder="Opsional" value={remark} onChange={(e) => setRemark(e.target.value)} />
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="button" onClick={onSubmit} loading={create.isPending} disabled={!selectedPo}>Post Goods Receipt</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal posting. PO harus RELEASED dan qty tidak boleh melebihi outstanding.</p>}
    </div>
  );
}

export function GoodsReceiptPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, isError, refetch } = useGoodsReceipts({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Goods Receipt</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Terima barang dari PO → update stock ledger (FR-PRO-009, FR-INV-001)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Tutup' : '+ Terima Barang'}
        </Button>
      </div>

      {showForm && <ReceiptForm onDone={() => setShowForm(false)} />}

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
          emptyMessage="Belum ada goods receipt"
        />
      </div>
    </div>
  );
}

export type { PurchaseOrder };
