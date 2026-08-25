import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid, Input, Label } from '@aec/ui';
import { useStockLedger, useStockSummary, useCreateWarehouse, useWarehouses } from '@/features/inventory';
import { formatIdr } from '@/shared/lib/format';

const PAGE_SIZE = 20;

const movementVariant: Record<string, 'success' | 'warning' | 'default'> = {
  IN: 'success',
  OUT: 'warning',
  ADJUST: 'default',
};

const columnHelper = createColumnHelper<import('@/features/inventory').StockLedgerEntry>();

const columns = [
  columnHelper.accessor('createdAt', {
    header: 'Tanggal',
    cell: (info) => <span className="tabular-nums text-neutral-500">{new Date(info.getValue()).toLocaleString('id-ID')}</span>,
  }),
  columnHelper.accessor('documentType', {
    header: 'Dokumen',
    cell: (info) => <Badge variant="default">{info.getValue()}</Badge>,
  }),
  columnHelper.accessor('reference', {
    header: 'Referensi',
    cell: (info) => <span className="font-mono text-neutral-700">{info.getValue() ?? '-'}</span>,
  }),
  columnHelper.accessor('wbsItem', {
    header: 'WBS',
    cell: (info) => <span className="text-neutral-600">{info.getValue() ? `${info.getValue()?.code} — ${info.getValue()?.name}` : '-'}</span>,
  }),
  columnHelper.accessor('movementType', {
    header: 'Jenis',
    cell: (info) => <Badge variant={movementVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  columnHelper.accessor('quantity', {
    header: 'Qty',
    cell: (info) => (
      <span className={`font-mono tabular-nums ${info.getValue() >= 0 ? 'text-emerald-700' : 'text-destructive-600'}`}>
        {info.getValue() >= 0 ? '+' : ''}{info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor('unit', {
    header: 'Unit',
    cell: (info) => <span className="text-neutral-600">{info.getValue()}</span>,
  }),
  columnHelper.accessor('balanceAfter', {
    header: 'Saldo',
    cell: (info) => <span className="font-mono tabular-nums text-neutral-800">{info.getValue()}</span>,
  }),
];

function WarehouseForm({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('PROJECT');
  const [location, setLocation] = useState('');
  const create = useCreateWarehouse();

  const onSubmit = () => {
    if (!code || !name) return;
    create.mutate(
      { code, name, warehouseType: type, location: location || undefined },
      { onSuccess: () => { setCode(''); setName(''); setLocation(''); onDone(); } },
    );
  };

  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="wh-code">Kode</Label>
          <Input id="wh-code" placeholder="WH-PROJ-014" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="wh-name">Nama</Label>
          <Input id="wh-name" placeholder="Warehouse Proyek" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="wh-type">Tipe</Label>
          <select id="wh-type" value={type} onChange={(e) => setType(e.target.value)} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20">
            <option value="PROJECT">PROJECT</option>
            <option value="CORPORATE">CORPORATE</option>
            <option value="TEMPORARY">TEMPORARY</option>
            <option value="VIRTUAL">VIRTUAL</option>
          </select>
        </div>
        <div>
          <Label htmlFor="wh-location">Lokasi</Label>
          <Input id="wh-location" placeholder="Karawang" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="button" onClick={onSubmit} loading={create.isPending}>Simpan</Button>
      </div>
    </div>
  );
}

export function StockLedgerPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showWarehouseForm, setShowWarehouseForm] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const { data, isLoading, isError, refetch } = useStockLedger({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const warehouses = useWarehouses({ page: 1, pageSize: 100 });
  const projectWh = (warehouses.data?.items ?? []).find((w) => w.warehouseType === 'PROJECT');
  const summary = useStockSummary(showSummary ? projectWh?.projectId ?? null : null);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Stock Ledger</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Semua perubahan stok berasal dari movement (FR-INV-001)</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setShowSummary((s) => !s)}>
            {showSummary ? 'Sembunyikan Ringkasan' : 'Ringkasan Stok'}
          </Button>
          <Button size="sm" onClick={() => setShowWarehouseForm((s) => !s)}>
            {showWarehouseForm ? 'Tutup' : '+ Warehouse'}
          </Button>
        </div>
      </div>

      {showWarehouseForm && <WarehouseForm onDone={() => setShowWarehouseForm(false)} />}

      {showSummary && (
        <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
          <h2 className="text-h3 text-neutral-900">Ringkasan Stok per WBS</h2>
          {summary.isLoading && <p className="mt-2 text-caption text-neutral-500">Memuat…</p>}
          {summary.data && summary.data.items.length === 0 && <p className="mt-2 text-caption text-neutral-500">Belum ada stok.</p>}
          {summary.data && summary.data.items.length > 0 && (
            <table className="mt-3 w-full text-left text-body">
              <thead className="text-caption uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-3 py-2">WBS</th>
                  <th className="px-3 py-2">Warehouse</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Nilai</th>
                </tr>
              </thead>
              <tbody>
                {summary.data.items.map((item) => (
                  <tr key={`${item.wbsItemId}-${item.warehouseId}`} className="border-t border-neutral-100">
                    <td className="px-3 py-2 text-neutral-700">{item.wbsItem ? `${item.wbsItem.code} — ${item.wbsItem.name}` : '-'}</td>
                    <td className="px-3 py-2 text-neutral-600">{item.warehouse.code}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-neutral-800">{item.quantity}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-neutral-700">
                      {formatIdr(item.totalValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
          emptyMessage="Belum ada stock movement"
        />
      </div>
    </div>
  );
}
