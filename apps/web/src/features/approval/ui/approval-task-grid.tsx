import { useState } from 'react';
import { Badge, Button, ConfirmDialog, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, EmptyCell, Input, StatusBadge, labelRole, useToast } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useDecideApproval } from '../model/approval.api';
import type { ApprovalTask } from '@aec/api-contracts';
import { formatDateTime } from '@/shared/lib/format';

const typeLabel: Record<string, string> = { PurchaseRequisition: 'PR', PurchaseOrder: 'PO' };

const columnHelper = createColumnHelper<ApprovalTask>();

export const approvalColumns = [
  columnHelper.accessor('transactionCode', { header: 'Document', cell: (i) => <span className="font-mono text-neutral-800">{i.getValue() ?? <EmptyCell />}</span> }),
  columnHelper.accessor('transactionType', { header: 'Type', cell: (i) => <Badge variant="default">{typeLabel[i.getValue()] ?? i.getValue()}</Badge> }),
  columnHelper.accessor('approverRoleCode', { header: 'Approver', cell: (i) => <span className="text-neutral-700">{labelRole(i.getValue())}</span> }),
  columnHelper.accessor('status', { header: 'Status', cell: (i) => <StatusBadge status={i.getValue()} /> }),
  columnHelper.accessor('comment', { header: 'Comment', cell: (i) => <span className="max-w-[240px] truncate text-neutral-600">{i.getValue() ?? <EmptyCell />}</span> }),
  columnHelper.accessor('createdAt', { header: 'Submitted', cell: (i) => <span className="tabular-nums text-neutral-500">{formatDateTime(i.getValue())}</span> }),
  columnHelper.display({ id: 'actions', header: '', cell: ({ row }) => <DecideButtons task={row.original} /> }),
];

function DecideButtons({ task }: { task: ApprovalTask }) {
  const decide = useDecideApproval();
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [comment, setComment] = useState('');
  if (!task.canApprove) return null;

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="secondary" onClick={() => setConfirmOpen(true)} loading={decide.isPending}>Approve</Button>
      <Button size="sm" variant="ghost" onClick={() => setRejectOpen(true)}>Reject</Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Approve document"
        description={`Approve ${task.transactionCode ?? task.transactionId}?`}
        confirmLabel="Approve"
        loading={decide.isPending}
        onConfirm={() => decide.mutate({ taskId: task.id, decision: 'APPROVE' }, { onSuccess: () => toast({ title: 'Approved', description: task.transactionCode ?? undefined, variant: 'success' }), onError: () => toast({ title: 'Failed to approve', description: 'Please check the related document.', variant: 'error' }) })}
      />
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject document</DialogTitle>
            <DialogDescription>Reject reason (optional)</DialogDescription>
          </DialogHeader>
          <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Rejection reason…" autoFocus />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { setRejectOpen(false); setComment(''); decide.mutate({ taskId: task.id, decision: 'REJECT', comment: comment || undefined }, { onSuccess: () => toast({ title: 'Rejected', description: task.transactionCode ?? undefined, variant: 'info' }), onError: () => toast({ title: 'Failed to reject', description: 'Please check the related document.', variant: 'error' }) }); }} loading={decide.isPending}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
