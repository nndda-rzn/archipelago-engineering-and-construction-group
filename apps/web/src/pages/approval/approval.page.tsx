import { useState } from 'react';
import { Badge, DataGrid } from '@aec/ui';
import { useApprovalTasks } from '@/features/approval';
import { approvalColumns } from '@/features/approval/ui';

const PAGE_SIZE = 20;

export function ApprovalPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const { data, isLoading, isError, refetch } = useApprovalTasks({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Approval</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Workflow approval PR/PO — maker-checker (FR-FND-007, BR-003)</p>
        </div>
        <Badge variant={data && data.total > 0 ? 'warning' : 'success'}>{data?.total ?? 0} task</Badge>
      </div>

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        <DataGrid columns={approvalColumns} data={data?.items ?? []} rowCount={data?.total ?? 0} pagination={pagination} onPaginationChange={setPagination} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage="Tidak ada approval task" exportFilename="approval-tasks" />
      </div>
    </div>
  );
}
