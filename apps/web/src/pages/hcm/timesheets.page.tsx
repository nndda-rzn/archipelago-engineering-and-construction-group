import { useState } from 'react';
import { Button, DataGrid } from '@aec/ui';
import { useTimesheets } from '@/features/hcm';
import { TimesheetForm, timesheetColumns } from '@/features/hcm/ui';

const PAGE_SIZE = 20;

export function TimesheetsPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading, isError, refetch } = useTimesheets({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize, status: statusFilter || undefined });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Timesheet</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Jam kerja karyawan ke project/WBS (FR-HCM-004)</p>
        </div>
        <div className="flex items-center gap-2">
          <select aria-label="Filter status" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPagination({ pageIndex: 0, pageSize: PAGE_SIZE }); }} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Semua status</option>
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="APPROVED">APPROVED</option>
          </select>
          <Button size="sm" onClick={() => setShowForm((s) => !s)}>{showForm ? 'Tutup' : '+ Kirim Timesheet'}</Button>
        </div>
      </div>

      {showForm && <TimesheetForm onDone={() => setShowForm(false)} />}
      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        <DataGrid columns={timesheetColumns} data={data?.items ?? []} rowCount={data?.total ?? 0} pagination={pagination} onPaginationChange={setPagination} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage="Belum ada timesheet" exportFilename="timesheets" />
      </div>
    </div>
  );
}
