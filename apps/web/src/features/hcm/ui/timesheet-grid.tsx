import { Badge, Button, ConfirmActionButton, EmptyCell, type BadgeVariant } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useApproveTimesheet } from '../model/hcm.api';
import type { Timesheet } from '@aec/api-contracts';
import { formatDate } from '@/shared/lib/format';

type TimesheetStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export const timesheetStatusVariant: Record<TimesheetStatus, BadgeVariant> = {
  SUBMITTED: 'default', APPROVED: 'success', REJECTED: 'warning',
};

const columnHelper = createColumnHelper<Timesheet>();

export const timesheetColumns = [
  columnHelper.accessor('workDate', { header: 'Tanggal', cell: (i) => <span className="font-mono text-neutral-600">{formatDate(i.getValue())}</span> }),
  columnHelper.accessor('employee', { header: 'Karyawan', cell: (i) => <span className="text-neutral-800 font-medium">{i.getValue()?.name}</span> }),
  columnHelper.accessor('project', { header: 'Project', cell: (i) => <span className="text-neutral-700">{i.getValue()?.code}</span> }),
  columnHelper.accessor('activity', { header: 'Aktivitas', cell: (i) => <span className="text-neutral-600">{i.getValue() ?? <EmptyCell />}</span> }),
  columnHelper.accessor('hours', { header: 'Jam', cell: (i) => <span className="font-mono font-medium tabular-nums text-neutral-800">{i.getValue()}</span> }),
  columnHelper.accessor('status', { header: 'Status', cell: ({ row }) => <Badge variant={timesheetStatusVariant[row.original.status as TimesheetStatus]}>{row.original.status}</Badge> }),
  columnHelper.display({ id: 'actions', header: '', cell: ({ row }) => <TimesheetApproveButtons entry={row.original} /> }),
];

function TimesheetApproveButtons({ entry }: { entry: Timesheet }) {
  const approve = useApproveTimesheet();
  if (entry.status !== 'SUBMITTED') return null;
  return <div className="flex items-center gap-1"><Button size="sm" variant="secondary" loading={approve.isPending} onClick={() => approve.mutate({ id: entry.id })}>Setujui</Button><ConfirmActionButton size="sm" variant="ghost" confirmTitle="Tolak timesheet?" confirmDescription="Timesheet akan ditolak." confirmLabel="Tolak" onConfirm={() => approve.mutate({ id: entry.id, status: 'REJECTED' })}>Tolak</ConfirmActionButton></div>;
}
