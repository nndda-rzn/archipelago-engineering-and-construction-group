import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid, useToast } from '@aec/ui';
import { useApprovalTasks, useDecideApproval, type ApprovalTask } from '@/features/approval';
import { formatDateTime } from '@/shared/lib/format';

const columnHelper = createColumnHelper<ApprovalTask>();

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'muted'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'default',
  CANCELLED: 'muted',
};

const typeLabel: Record<string, string> = {
  PurchaseRequisition: 'PR',
  PurchaseOrder: 'PO',
};

const columns = [
  columnHelper.accessor('transactionCode', {
    header: 'Dokumen',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue() ?? '-'}</span>,
  }),
  columnHelper.accessor('transactionType', {
    header: 'Tipe',
    cell: (info) => <Badge variant="default">{typeLabel[info.getValue()] ?? info.getValue()}</Badge>,
  }),
  columnHelper.accessor('approverRoleCode', {
    header: 'Approver',
    cell: (info) => <span className="text-neutral-700">{info.getValue()}</span>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  columnHelper.accessor('comment', {
    header: 'Komentar',
    cell: (info) => <span className="max-w-[240px] truncate text-neutral-600">{info.getValue() ?? '-'}</span>,
  }),
  columnHelper.accessor('createdAt', {
    header: 'Diajukan',
    cell: (info) => <span className="tabular-nums text-neutral-500">{formatDateTime(info.getValue())}</span>,
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <DecideButtons task={row.original} />,
  }),
];

function DecideButtons({ task }: { task: ApprovalTask }) {
  const decide = useDecideApproval();
  const toast = useToast();
  if (!task.canApprove) return null;

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          if (window.confirm(`Approve ${task.transactionCode ?? task.transactionId}?`)) {
            decide.mutate(
              { taskId: task.id, decision: 'APPROVE' },
              {
                onSuccess: () => toast({ title: 'Disetujui', description: task.transactionCode ?? undefined, variant: 'success' }),
                onError: () => toast({ title: 'Gagal menyetujui', description: 'Periksa kembali dokumen terkait.', variant: 'error' }),
              },
            );
          }
        }}
        loading={decide.isPending}
      >
        Approve
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          const comment = window.prompt('Alasan reject (opsional)') ?? undefined;
          decide.mutate(
            { taskId: task.id, decision: 'REJECT', comment },
            {
              onSuccess: () => toast({ title: 'Ditolak', description: task.transactionCode ?? undefined, variant: 'info' }),
              onError: () => toast({ title: 'Gagal menolak', description: 'Periksa kembali dokumen terkait.', variant: 'error' }),
            },
          );
        }}
      >
        Reject
      </Button>
    </div>
  );
}

export function ApprovalPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const { data, isLoading, isError, refetch } = useApprovalTasks({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Approval</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Workflow approval PR/PO — maker-checker (FR-FND-007, BR-003)</p>
        </div>
        <Badge variant={data && data.total > 0 ? 'warning' : 'success'}>
          {data?.total ?? 0} task
        </Badge>
      </div>

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
          emptyMessage="Tidak ada approval task"
        />
      </div>
    </div>
  );
}
