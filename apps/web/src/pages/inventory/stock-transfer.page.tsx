import { useState } from 'react';
import { Button, DataGrid } from '@aec/ui';
import { useStockTransfers } from '@/features/inventory';
import { TransferForm, stockTransferColumns } from '@/features/inventory';
import { PAGE_SIZE } from '@/shared/lib/pagination';

export function StockTransferPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading, isError, refetch } = useStockTransfers({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Stock Transfer</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Move stock between warehouses (FR-INV-005)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>{showForm ? 'Close' : '+ Transfer Stock'}</Button>
      </div>

      {showForm && <TransferForm onDone={() => setShowForm(false)} />}
      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        <DataGrid columns={stockTransferColumns} data={data?.items ?? []} rowCount={data?.total ?? 0} pagination={pagination} onPaginationChange={setPagination} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage="No stock transfers yet" exportFilename="stock-transfers" />
      </div>
    </div>
  );
}
