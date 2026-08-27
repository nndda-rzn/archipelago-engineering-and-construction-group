import { useState } from 'react';
import { Button, DataGrid } from '@aec/ui';
import { useStockLedger, useStockSummary, useWarehouses } from '@/features/inventory';
import { WarehouseForm, ledgerColumns } from '@/features/inventory';
import { formatIdr } from '@/shared/lib/format';

const PAGE_SIZE = 20;

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
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-neutral-700">{formatIdr(item.totalValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        <DataGrid
          columns={ledgerColumns}
          data={data?.items ?? []}
          rowCount={data?.total ?? 0}
          pagination={pagination}
          onPaginationChange={setPagination}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          emptyMessage="Belum ada stock movement"
          exportFilename="stock-ledger"
        />
      </div>
    </div>
  );
}
