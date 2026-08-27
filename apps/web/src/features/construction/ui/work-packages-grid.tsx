import { Badge } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import type { WorkPackage } from '@aec/api-contracts';

export const statusVariant: Record<string, 'default' | 'success' | 'warning'> = {
  DRAFT: 'default',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'default',
};

export const statusLabel: Record<string, string> = {
  DRAFT: 'Draft',
  IN_PROGRESS: 'Berjalan',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

const columnHelper = createColumnHelper<WorkPackage>();

export const workPackageColumns = [
  columnHelper.accessor('wpNumber', { header: 'Nomor', cell: (info) => <span className="font-mono text-neutral-600">{info.getValue()}</span> }),
  columnHelper.accessor('title', { header: 'Work Package' }),
  columnHelper.accessor('wbs', {
    header: 'WBS',
    cell: (info) => (info.getValue() ? <span className="font-mono text-neutral-600">{info.getValue()?.code}</span> : '-'),
  }),
  columnHelper.accessor('plannedQty', {
    header: 'Qty Rencana',
    cell: (info) => `${info.getValue()} ${info.row.original.unit}`,
  }),
  columnHelper.accessor('latestProgress', {
    header: 'Progress',
    cell: (info) =>
      info.getValue() != null ? (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full rounded-full bg-racing-red-600" style={{ width: `${info.getValue()}%` }} />
          </div>
          <span className="font-mono text-xs tabular-nums text-neutral-700">{info.getValue()}%</span>
        </div>
      ) : (
        <span className="text-neutral-400">-</span>
      ),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{statusLabel[info.getValue()] ?? info.getValue()}</Badge>,
  }),
];
