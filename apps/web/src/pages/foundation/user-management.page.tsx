import { useState } from 'react';
import type { SortingState } from '@tanstack/react-table';
import { Button, DataGrid, Input } from '@aec/ui';
import { useUsers } from '@/entities/user';
import { UserForm, userColumns } from '@/features/foundation/ui';
import { PAGE_SIZE } from '@/shared/lib/pagination';

export function UserManagementPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, isError, refetch } = useUsers({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize, search: search || undefined });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">User Management</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Pengguna sistem &amp; assignment role (FR-FND-003)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>{showForm ? 'Tutup' : '+ Tambah User'}</Button>
      </div>

      {showForm && <UserForm onDone={() => setShowForm(false)} />}

      <div className="mb-4 w-64">
        <Input type="search" placeholder="Cari username, nama, email..." value={search} onChange={(e) => { setSearch(e.target.value); setPagination((p) => ({ ...p, pageIndex: 0 })); }} />
      </div>

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        <DataGrid columns={userColumns} data={data?.items ?? []} rowCount={data?.total ?? 0} pagination={pagination} onPaginationChange={setPagination} sorting={sorting} onSortingChange={setSorting} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage="Belum ada user" exportFilename="users" />
      </div>
    </div>
  );
}
