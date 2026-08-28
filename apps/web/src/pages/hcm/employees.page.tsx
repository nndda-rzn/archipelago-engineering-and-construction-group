import { useState } from 'react';
import { Button, DataGrid } from '@aec/ui';
import { useAssignments, useEmployees } from '@/features/hcm';
import { EmployeeForm, AssignmentForm, employeeColumns, assignmentColumns } from '@/features/hcm/ui';
import { PAGE_SIZE } from '@/shared/lib/pagination';

export function EmployeesPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading, isError, refetch } = useEmployees({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize, status: statusFilter || undefined });
  const { data: assignData } = useAssignments(selectedId ?? '');

  const selected = data?.items.find((e) => e.id === selectedId) ?? null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Employees</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Master karyawan + project assignment (FR-HCM-001/002/003)</p>
        </div>
        <div className="flex items-center gap-2">
          <select aria-label="Filter status" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPagination({ pageIndex: 0, pageSize: PAGE_SIZE }); }} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Semua status</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
          <Button size="sm" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Tutup' : '+ Buat Employee'}
          </Button>
        </div>
      </div>

      {showForm && <EmployeeForm onDone={() => setShowForm(false)} />}

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        <DataGrid
          columns={employeeColumns}
          data={data?.items ?? []}
          rowCount={data?.total ?? 0}
          pagination={pagination}
          onPaginationChange={setPagination}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          onRowClick={(row) => setSelectedId(row.original.id)}
          emptyMessage="Belum ada employee"
        />
      </div>

      {selected && (
        <div className="mt-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
          <h2 className="text-h2 text-neutral-950">{selected.employeeNumber} — {selected.name}</h2>
          <p className="text-caption text-neutral-500">{selected.position} · {selected.department ?? '-'} · Klik baris lain untuk ganti</p>
          <AssignmentForm employee={selected} />
          <div className="mt-4">
            <DataGrid columns={assignmentColumns} data={assignData?.items ?? []} emptyMessage="Belum ada assignment" hideToolbar />
          </div>
        </div>
      )}
    </div>
  );
}
