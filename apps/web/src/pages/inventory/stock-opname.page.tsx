import { useState } from 'react';
import { Button, DataGrid } from '@aec/ui';
import { useStockOpnames } from '@/features/inventory';
import { OpnameForm, opnameColumns } from '@/features/inventory';
import { PAGE_SIZE } from '@/shared/lib/pagination';

export function StockOpnamePage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading, isError, refetch } = useStockOpnames({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Stock Opname</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Count sheet + reconciliation (FR-INV-007)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>{showForm ? 'Close' : '+ Start Opname'}</Button>
      </div>

      {showForm && <OpnameForm onDone={() => setShowForm(false)} />}
      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        <DataGrid columns={opnameColumns} data={data?.items ?? []} rowCount={data?.total ?? 0} pagination={pagination} onPaginationChange={setPagination} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage="No stock opnames yet" exportFilename="stock-opnames" />
      </div>
    </div>
  );
}
