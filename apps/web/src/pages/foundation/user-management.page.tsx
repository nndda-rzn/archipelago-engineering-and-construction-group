import { useState } from 'react';
import type { SortingState } from '@tanstack/react-table';
import { Button, DataGrid, Input } from '@aec/ui';
import { useUsers } from '@/entities/user';
import { UserForm, userColumns } from '@/features/foundation/ui';
import { PAGE_SIZE } from '@/shared/lib/pagination';
import { useUrlFilter, useUrlPagination } from '@/shared/lib/use-url-state';

export function UserManagementPage() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useUrlFilter('q');
  const { pagination, onPaginationChange } = useUrlPagination(PAGE_SIZE);

  const { data, isLoading, isError, refetch } = useUsers({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize, search: search || undefined });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">User Management</h1>
          <p className="mt-1 text-body-sm text-neutral-500">System users &amp; role assignment</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>{showForm ? 'Close' : '+ Add User'}</Button>
      </div>

      {showForm && <UserForm onDone={() => setShowForm(false)} />}

      <div className="mb-4 w-64">
        <Input type="search" placeholder="Search username, name, email..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        <DataGrid columns={userColumns} data={data?.items ?? []} rowCount={data?.total ?? 0} pagination={pagination} onPaginationChange={onPaginationChange} sorting={sorting} onSortingChange={setSorting} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage="No users yet" exportFilename="users" />
      </div>
    </div>
  );
}
