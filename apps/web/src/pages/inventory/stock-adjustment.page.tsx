import { useState } from 'react';
import { Button, DataGrid } from '@aec/ui';
import { useStockAdjustments } from '@/features/inventory';
import { AdjustmentForm, adjustmentColumns } from '@/features/inventory';
import { PAGE_SIZE } from '@/shared/lib/pagination';

export function StockAdjustmentPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, isError, refetch } = useStockAdjustments({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Stock Adjustment</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Penyesuaian stok · wajib approval + reason code (FR-INV-006)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Tutup' : '+ Buat Adjustment'}
        </Button>
      </div>

      {showForm && <AdjustmentForm onDone={() => setShowForm(false)} />}

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        <DataGrid
          columns={adjustmentColumns}
          data={data?.items ?? []}
          rowCount={data?.total ?? 0}
          pagination={pagination}
          onPaginationChange={setPagination}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          emptyMessage="Belum ada stock adjustment"
        />
      </div>
    </div>
  );
}
