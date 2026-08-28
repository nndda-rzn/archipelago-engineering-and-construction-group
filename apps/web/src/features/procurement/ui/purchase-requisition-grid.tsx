import { Badge, ConfirmActionButton, EmptyCell, type BadgeVariant } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useSubmitForApproval } from '@/features/approval';
import type { PurchaseRequisition } from '@aec/api-contracts';

type PrStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

const statusVariant: Record<PrStatus, BadgeVariant> = {
  DRAFT: 'default', SUBMITTED: 'info', APPROVED: 'success', REJECTED: 'destructive', CANCELLED: 'muted',
};
const columnHelper = createColumnHelper<PurchaseRequisition>();

export const purchaseRequisitionColumns = [
  columnHelper.accessor('prNumber', { header: 'Nomor PR', cell: (i) => <span className="font-mono text-neutral-800">{i.getValue()}</span> }),
  columnHelper.accessor('project', { header: 'Project', cell: (i) => <span className="text-neutral-700">{i.getValue()?.code ?? <EmptyCell />}</span> }),
  columnHelper.accessor('requestedBy', { header: 'Diminta Oleh', cell: (i) => <span className="text-neutral-600">{i.getValue()}</span> }),
  columnHelper.accessor('items', { header: 'Item', cell: (i) => <span className="text-neutral-600">{i.getValue().length} item</span> }),
  columnHelper.accessor('status', { header: 'Status', cell: (i) => <Badge variant={statusVariant[i.getValue() as PrStatus]}>{i.getValue()}</Badge> }),
  columnHelper.display({ id: 'actions', header: '', cell: ({ row }) => <SubmitButton pr={row.original} /> }),
];

function SubmitButton({ pr }: { pr: PurchaseRequisition }) {
  const submit = useSubmitForApproval();
  if (pr.status !== 'DRAFT') return null;
  return <ConfirmActionButton size="sm" variant="secondary" confirmTitle="Ajukan approval" confirmDescription={`Ajukan ${pr.prNumber} untuk approval?`} confirmLabel="Ajukan" onConfirm={() => submit.mutate({ transactionType: 'PurchaseRequisition', transactionId: pr.id, transactionCode: pr.prNumber, approverRoleCode: 'PROCUREMENT_MANAGER' })} loading={submit.isPending}>Ajukan Approval</ConfirmActionButton>;
}
