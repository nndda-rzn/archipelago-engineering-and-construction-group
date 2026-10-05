import { StatusBadge } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import type { HandoverPackage } from '@aec/api-contracts';
import { formatDate } from '@/shared/lib/format';

export type HandoverStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'COMPLETED';

export const statusLabel: Record<HandoverStatus, string> = {
  DRAFT: 'Draft', SUBMITTED: 'Submitted', APPROVED: 'Approved', COMPLETED: 'Completed',
};

const columnHelper = createColumnHelper<HandoverPackage>();
export const handoverColumns = [
  columnHelper.accessor('hoNumber', { header: 'Number', cell: (i) => <span className="font-mono text-neutral-600">{i.getValue()}</span> }),
  columnHelper.accessor('title', { header: 'Title' }),
  columnHelper.accessor('handoverDate', { header: 'Date', cell: (i) => formatDate(i.getValue()) }),
  columnHelper.accessor('items', { header: 'Documents', cell: (i) => { const items = i.getValue(); const verified = items.filter((x) => x.status === 'VERIFIED').length; return <span className="font-mono text-xs tabular-nums">{verified}/{items.length} verified</span>; } }),
  columnHelper.accessor('status', { header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} label={statusLabel[row.original.status as HandoverStatus]} /> }),
];
