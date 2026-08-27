import { Badge } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import type { HandoverPackage } from '@aec/api-contracts';

export const statusVariant: Record<string, 'default' | 'warning' | 'success'> = {
  DRAFT: 'default', SUBMITTED: 'warning', APPROVED: 'success', COMPLETED: 'success',
};
export const statusLabel: Record<string, string> = {
  DRAFT: 'Draft', SUBMITTED: 'Diajukan', APPROVED: 'Disetujui', COMPLETED: 'Selesai',
};

const columnHelper = createColumnHelper<HandoverPackage>();
export const handoverColumns = [
  columnHelper.accessor('hoNumber', { header: 'Nomor', cell: (i) => <span className="font-mono text-neutral-600">{i.getValue()}</span> }),
  columnHelper.accessor('title', { header: 'Judul' }),
  columnHelper.accessor('handoverDate', { header: 'Tanggal', cell: (i) => i.getValue() ? new Date(i.getValue() as string).toLocaleDateString('id-ID') : '-' }),
  columnHelper.accessor('items', { header: 'Dokumen', cell: (i) => { const items = i.getValue(); const verified = items.filter((x) => x.status === 'VERIFIED').length; return <span className="font-mono text-xs tabular-nums">{verified}/{items.length} verified</span>; } }),
  columnHelper.accessor('status', { header: 'Status', cell: (i) => <Badge variant={statusVariant[i.getValue()] ?? 'default'}>{statusLabel[i.getValue()] ?? i.getValue()}</Badge> }),
];
