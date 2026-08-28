import { useState } from 'react';
import { Button, DataGrid, Input } from '@aec/ui';
import { usePayrollAllocations } from '@/features/hcm';
import { PayrollForm, payrollColumns } from '@/features/hcm/ui';
import { PAGE_SIZE } from '@/shared/lib/pagination';

export function PayrollPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);
  const [periodFilter, setPeriodFilter] = useState('');
  const { data, isLoading, isError, refetch } = usePayrollAllocations({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize, period: periodFilter || undefined });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Payroll Allocation</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Alokasi gaji ke project + corporate overhead (FR-HCM-005)</p>
        </div>
        <div className="flex items-center gap-2">
          <Input aria-label="Filter periode" placeholder="mis. 2026-08" value={periodFilter} onChange={(e) => { setPeriodFilter(e.target.value); setPagination({ pageIndex: 0, pageSize: PAGE_SIZE }); }} className="h-9 w-32" />
          <Button size="sm" onClick={() => setShowForm((s) => !s)}>{showForm ? 'Tutup' : '+ Buat Alokasi'}</Button>
        </div>
      </div>

      {showForm && <PayrollForm onDone={() => setShowForm(false)} />}
      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        <DataGrid columns={payrollColumns} data={data?.items ?? []} rowCount={data?.total ?? 0} pagination={pagination} onPaginationChange={setPagination} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage="Belum ada alokasi payroll" exportFilename="payroll-allocations" />
      </div>
    </div>
  );
}
