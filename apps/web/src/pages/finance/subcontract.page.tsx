import { useState } from 'react';
import { Button, DataGrid, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useSubcontractProgress, useSubcontracts } from '@/features/finance';
import { SubconForm, ProgressForm, subcontractColumns, progressColumns } from '@/features/finance/ui';
import { formatIdr as fmt } from '@/shared/lib/format';
import { PAGE_SIZE } from '@/shared/lib/pagination';

export function SubcontractPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading, isError, refetch } = useSubcontracts({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize, status: statusFilter || undefined });
  const { data: progressData, isLoading: progressLoading } = useSubcontractProgress(selectedId ?? '', { page: 1, pageSize: 50 });

  const selected = data?.items.find((s) => s.id === selectedId) ?? null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Subcontract</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Subcontractor payments based on verified progress (FR-CMR-008)</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPagination({ pageIndex: 0, pageSize: PAGE_SIZE }); }}>
            <SelectTrigger className="w-auto" aria-label="Filter status"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">ACTIVE</SelectItem>
              <SelectItem value="COMPLETED">COMPLETED</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Close' : '+ Create Subcontract'}
          </Button>
        </div>
      </div>

      {showForm && <SubconForm onDone={() => setShowForm(false)} />}

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        <DataGrid
          columns={subcontractColumns}
          data={data?.items ?? []}
          rowCount={data?.total ?? 0}
          pagination={pagination}
          onPaginationChange={setPagination}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          onRowClick={(row) => setSelectedId(row.original.id)} selectedRowId={selectedId ?? undefined} getRowId={(row) => row.id}
          emptyMessage="No subcontracts yet"
        />
      </div>

      {selected && (
        <div className="mt-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
          <h2 className="text-h2 text-neutral-950">{selected.subconNumber} · {selected.title}</h2>
          <p className="text-caption text-neutral-500">
            {selected.vendor} · Contract value {fmt(selected.contractValue)} · Click another row to switch
          </p>
          <ProgressForm subcontract={selected} />
          <div className="mt-4">
            <DataGrid
              columns={progressColumns}
              data={progressData?.items ?? []}
              rowCount={progressData?.total ?? 0}
              isLoading={progressLoading}
              emptyMessage="No progress yet"
              hideToolbar
            />
          </div>
        </div>
      )}
    </div>
  );
}
