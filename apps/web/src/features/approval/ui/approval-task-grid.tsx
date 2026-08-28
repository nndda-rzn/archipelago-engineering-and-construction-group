import { useState } from 'react';
import { Badge, type BadgeVariant, Button, ConfirmDialog, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, EmptyCell, Input, useToast } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useDecideApproval } from '../model/approval.api';
import type { ApprovalTask } from '@aec/api-contracts';
import { formatDateTime } from '@/shared/lib/format';

type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export const approvalStatusVariant: Record<ApprovalStatus, BadgeVariant> = {
  PENDING: 'warning', APPROVED: 'success', REJECTED: 'default', CANCELLED: 'muted',
};

const typeLabel: Record<string, string> = { PurchaseRequisition: 'PR', PurchaseOrder: 'PO' };

const columnHelper = createColumnHelper<ApprovalTask>();

export const approvalColumns = [
  columnHelper.accessor('transactionCode', { header: 'Dokumen', cell: (i) => <span className="font-mono text-neutral-800">{i.getValue() ?? <EmptyCell />}</span> }),
  columnHelper.accessor('transactionType', { header: 'Tipe', cell: (i) => <Badge variant="default">{typeLabel[i.getValue()] ?? i.getValue()}</Badge> }),
  columnHelper.accessor('approverRoleCode', { header: 'Approver', cell: (i) => <span className="text-neutral-700">{i.getValue()}</span> }),
  columnHelper.accessor('status', { header: 'Status', cell: (i) => <Badge variant={approvalStatusVariant[i.getValue() as ApprovalStatus]}>{i.getValue()}</Badge> }),
  columnHelper.accessor('comment', { header: 'Komentar', cell: (i) => <span className="max-w-[240px] truncate text-neutral-600">{i.getValue() ?? <EmptyCell />}</span> }),
  columnHelper.accessor('createdAt', { header: 'Diajukan', cell: (i) => <span className="tabular-nums text-neutral-500">{formatDateTime(i.getValue())}</span> }),
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
        title="Setujui dokumen"
        description={`Approve ${task.transactionCode ?? task.transactionId}?`}
        confirmLabel="Approve"
        loading={decide.isPending}
        onConfirm={() => decide.mutate({ taskId: task.id, decision: 'APPROVE' }, { onSuccess: () => toast({ title: 'Disetujui', description: task.transactionCode ?? undefined, variant: 'success' }), onError: () => toast({ title: 'Gagal menyetujui', description: 'Periksa kembali dokumen terkait.', variant: 'error' }) })}
      />
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tolak dokumen</DialogTitle>
            <DialogDescription>Alasan reject (opsional)</DialogDescription>
          </DialogHeader>
          <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Alasan penolakan..." autoFocus />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={() => { setRejectOpen(false); setComment(''); decide.mutate({ taskId: task.id, decision: 'REJECT', comment: comment || undefined }, { onSuccess: () => toast({ title: 'Ditolak', description: task.transactionCode ?? undefined, variant: 'info' }), onError: () => toast({ title: 'Gagal menolak', description: 'Periksa kembali dokumen terkait.', variant: 'error' }) }); }} loading={decide.isPending}>Tolak</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
