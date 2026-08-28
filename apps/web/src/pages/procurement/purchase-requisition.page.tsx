import { useState } from 'react';
import { Button, DataGrid } from '@aec/ui';
import { usePrs } from '@/features/procurement';
import { PurchaseRequisitionForm, purchaseRequisitionColumns } from '@/features/procurement/ui';
import { PAGE_SIZE } from '@/shared/lib/pagination';

export function PurchaseRequisitionPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading, isError, refetch } = usePrs({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Purchase Requisition</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Permintaan pembelian (FR-PRO-001)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>{showForm ? 'Tutup' : '+ Buat PR'}</Button>
      </div>
      {showForm && <PurchaseRequisitionForm onDone={() => setShowForm(false)} />}
      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        <DataGrid columns={purchaseRequisitionColumns} data={data?.items ?? []} rowCount={data?.total ?? 0} pagination={pagination} onPaginationChange={setPagination} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage="Belum ada PR" exportFilename="purchase-requisitions" />
      </div>
    </div>
  );
}
