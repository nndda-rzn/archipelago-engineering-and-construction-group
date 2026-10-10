import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid, EmptyCell } from '@aec/ui';
import { useMaterialIssues, type MaterialIssue } from '@/features/inventory';
import { IssueForm } from '@/features/inventory';
import { PAGE_SIZE } from '@/shared/lib/pagination';

const columnHelper = createColumnHelper<MaterialIssue>();

const columns = [
  columnHelper.accessor('issueNumber', {
    header: 'Number',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  columnHelper.accessor('project', {
    header: 'Project',
    cell: (info) => <span className="text-neutral-600">{info.getValue()?.code ?? <EmptyCell />}</span>,
  }),
  columnHelper.accessor('warehouse', {
    header: 'Warehouse',
    cell: (info) => <span className="text-neutral-700">{info.getValue()?.code ?? <EmptyCell />}</span>,
  }),
  columnHelper.accessor('issuedTo', {
    header: 'Issued To',
    cell: (info) => <span className="text-neutral-700">{info.getValue()}</span>,
  }),
  columnHelper.accessor('items', {
    header: 'Items',
    cell: (info) => <span className="tabular-nums text-neutral-600">{info.getValue().length} rows</span>,
  }),
  columnHelper.accessor('issueReason', {
    header: 'Reason',
    cell: (info) => <Badge variant="default">{info.getValue()}</Badge>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={info.getValue() === 'POSTED' ? 'success' : 'default'}>{info.getValue()}</Badge>,
  }),
];

export function MaterialIssuePage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, isError, refetch } = useMaterialIssues({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Material Issue</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Issue material → reduce stock + project consumption</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Close' : '+ Issue Material'}
        </Button>
      </div>

      {showForm && <IssueForm onDone={() => setShowForm(false)} />}

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        <DataGrid
          columns={columns}
          data={data?.items ?? []}
          rowCount={data?.total ?? 0}
          pagination={pagination}
          onPaginationChange={setPagination}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          emptyMessage="No material issues yet"
        />
      </div>
    </div>
  );
}
