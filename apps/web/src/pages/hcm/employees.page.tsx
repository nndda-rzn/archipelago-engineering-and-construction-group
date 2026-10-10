import { useState } from 'react';
import { Button, DataGrid, EmptyCell, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useAssignments, useEmployees } from '@/features/hcm';
import { EmployeeForm, AssignmentForm, employeeColumns, assignmentColumns } from '@/features/hcm/ui';
import { PAGE_SIZE } from '@/shared/lib/pagination';
import { useUrlFilter, useUrlPagination } from '@/shared/lib/use-url-state';

export function EmployeesPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useUrlFilter('status');
  const { pagination, onPaginationChange } = useUrlPagination(PAGE_SIZE);
  const { data, isLoading, isError, refetch } = useEmployees({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize, status: statusFilter || undefined });
  const { data: assignData, isLoading: assignLoading } = useAssignments(selectedId ?? '');

  const selected = data?.items.find((e) => e.id === selectedId) ?? null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Employees</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Employee master + project assignment</p>
        </div>
        <div className="flex items-center gap-2">
          <Select aria-label="Filter status" value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Semua status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">ACTIVE</SelectItem>
              <SelectItem value="INACTIVE">INACTIVE</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Close' : '+ Create Employee'}
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
          onPaginationChange={onPaginationChange}
          isLoading={isLoading}
          isError={isError}
           onRetry={() => refetch()}
           onRowClick={(row) => setSelectedId(row.original.id)}
           selectedRowId={selectedId ?? undefined}
           getRowId={(row) => row.id}
           emptyMessage="No employees yet"
        />
      </div>

      {selected && (
        <div className="mt-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
          <h2 className="text-h2 text-neutral-950">{selected.employeeNumber} · {selected.name}</h2>
          <p className="text-caption text-neutral-500">{selected.position} · {selected.department ?? <EmptyCell />} · Klik baris lain untuk ganti</p>
          <AssignmentForm employee={selected} />
          <div className="mt-4">
            <DataGrid columns={assignmentColumns} data={assignData?.items ?? []} isLoading={assignLoading} emptyMessage="No assignments yet" hideToolbar />
          </div>
        </div>
      )}
    </div>
  );
}
