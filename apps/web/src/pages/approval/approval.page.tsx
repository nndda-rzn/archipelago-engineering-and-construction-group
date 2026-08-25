import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid } from '@aec/ui';
import { useApprovalTasks, useDecideApproval, type ApprovalTask } from '@/features/approval/approval.api';

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
    cell: (info) => <span className="tabular-nums text-neutral-500">{new Date(info.getValue()).toLocaleString('id-ID')}</span>,
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <DecideButtons task={row.original} />,
  }),
];

function DecideButtons({ task }: { task: ApprovalTask }) {
  const decide = useDecideApproval();
  if (!task.canApprove) return null;

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          if (window.confirm(`Approve ${task.transactionCode ?? task.transactionId}?`)) {
            decide.mutate({ taskId: task.id, decision: 'APPROVE' });
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
          decide.mutate({ taskId: task.id, decision: 'REJECT', comment });
        }}
      >
        Reject
      </Button>
    </div>
  );
}

export function ApprovalPage() {
  const { data, isLoading, isError, refetch } = useApprovalTasks();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Approval</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Workflow approval PR/PO — maker-checker (FR-FND-007, BR-003)</p>
        </div>
        <Badge variant={data && data.total > 0 ? 'warning' : 'success'}>
          {data?.total ?? 0} pending
        </Badge>
      </div>

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        <DataGrid
          columns={columns}
          data={data?.items ?? []}
          rowCount={data?.items.length ?? 0}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          emptyMessage="Tidak ada approval task"
        />
      </div>
    </div>
  );
}
