import { createColumnHelper } from '@tanstack/react-table';
import { Button, StatusBadge } from '@aec/ui';
import { useApprovePoChange, type PoChange } from '@/features/procurement';
import { formatIdr as fmt } from '@/shared/lib/format';

const pcHelper = createColumnHelper<PoChange>();

function PoChangeApproveCell({ id, status }: { id: string; status: string }) {
  const approve = useApprovePoChange();
  if (status !== 'DRAFT') return null;
  return (
    <Button size="sm" variant="secondary" loading={approve.isPending} onClick={() => approve.mutate(id)}>
      Approve
    </Button>
  );
}

export const pcColumns = [
  pcHelper.accessor('changeNumber', { header: 'No.', cell: (i) => <span className="font-mono text-neutral-800">{i.getValue()}</span> }),
  pcHelper.accessor('version', { header: 'Version', cell: (i) => <span className="font-mono text-neutral-600">v{i.getValue()}</span> }),
  pcHelper.accessor('previousTotal', { header: 'Before', cell: (i) => <span className="font-mono tabular-nums text-neutral-700">{fmt(i.getValue())}</span> }),
  pcHelper.accessor('newTotal', { header: 'After', cell: (i) => <span className="font-mono tabular-nums text-neutral-800">{fmt(i.getValue())}</span> }),
  pcHelper.accessor('reason', { header: 'Reason', cell: (i) => <span className="max-w-[200px] truncate text-neutral-600">{i.getValue()}</span> }),
  pcHelper.accessor('status', { header: 'Status', cell: (i) => <StatusBadge status={i.getValue()} /> }),
  pcHelper.display({ id: 'actions', header: '', cell: ({ row }) => <PoChangeApproveCell id={row.original.id} status={row.original.status} /> }),
];
