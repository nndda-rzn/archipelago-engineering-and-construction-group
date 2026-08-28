import { Badge, type BadgeVariant } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import type { HandoverPackage } from '@aec/api-contracts';
import { formatDate } from '@/shared/lib/format';

export type HandoverStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'COMPLETED';

export const statusVariant: Record<HandoverStatus, BadgeVariant> = {
  DRAFT: 'default', SUBMITTED: 'warning', APPROVED: 'success', COMPLETED: 'success',
};
export const statusLabel: Record<HandoverStatus, string> = {
  DRAFT: 'Draft', SUBMITTED: 'Diajukan', APPROVED: 'Disetujui', COMPLETED: 'Selesai',
};

const columnHelper = createColumnHelper<HandoverPackage>();
export const handoverColumns = [
  columnHelper.accessor('hoNumber', { header: 'Nomor', cell: (i) => <span className="font-mono text-neutral-600">{i.getValue()}</span> }),
  columnHelper.accessor('title', { header: 'Judul' }),
  columnHelper.accessor('handoverDate', { header: 'Tanggal', cell: (i) => formatDate(i.getValue()) }),
  columnHelper.accessor('items', { header: 'Dokumen', cell: (i) => { const items = i.getValue(); const verified = items.filter((x) => x.status === 'VERIFIED').length; return <span className="font-mono text-xs tabular-nums">{verified}/{items.length} verified</span>; } }),
  columnHelper.accessor('status', { header: 'Status', cell: ({ row }) => <Badge variant={statusVariant[row.original.status as HandoverStatus]}>{statusLabel[row.original.status as HandoverStatus]}</Badge> }),
];
