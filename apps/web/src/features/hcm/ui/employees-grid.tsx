import { Button, ConfirmActionButton, EmptyCell, StatusBadge } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useChangeEmployeeStatus } from '../model/hcm.api';
import type { Employee, ProjectAssignment } from '@aec/api-contracts';
import { formatDate } from '@/shared/lib/format';

const columnHelper = createColumnHelper<Employee>();
const assignHelper = createColumnHelper<ProjectAssignment>();

export const employeeColumns = [
  columnHelper.accessor('employeeNumber', {
    header: 'Employee No.',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  columnHelper.accessor('name', {
    header: 'Name',
    cell: (info) => <span className="text-neutral-800 font-medium">{info.getValue()}</span>,
  }),
  columnHelper.accessor('position', {
    header: 'Position',
    cell: (info) => <span className="text-neutral-700">{info.getValue()}</span>,
  }),
  columnHelper.accessor('grade', {
    header: 'Grade',
    cell: (info) => <span className="font-mono text-neutral-600">{info.getValue() ?? <EmptyCell />}</span>,
  }),
  columnHelper.accessor('department', {
    header: 'Department',
    cell: (info) => <span className="text-neutral-600">{info.getValue() ?? <EmptyCell />}</span>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <StatusButtons employee={row.original} />,
  }),
];

function StatusButtons({ employee }: { employee: Employee }) {
  const change = useChangeEmployeeStatus();
  if (employee.status === 'LEAVER') return null;
  const pendingFor = (status: string) => change.isPending && change.variables?.status === status;
  return (
    <div className="flex items-center gap-1">
      {employee.status === 'INACTIVE' ? (
        <Button size="sm" variant="ghost" loading={pendingFor('ACTIVE')} onClick={() => change.mutate({ id: employee.id, status: 'ACTIVE' })}>
          Activate
        </Button>
      ) : (
        <ConfirmActionButton size="sm" variant="ghost" loading={pendingFor('INACTIVE')} confirmTitle="Deactivate employee?" confirmDescription="The employee will be set to inactive." confirmLabel="Deactivate" onConfirm={() => change.mutate({ id: employee.id, status: 'INACTIVE' })}>
          Deactivate
        </ConfirmActionButton>
      )}
      <ConfirmActionButton size="sm" variant="ghost" className="text-destructive-600" loading={pendingFor('LEAVER')} confirmTitle="Change to Leaver?" confirmDescription="The employee will be set to Leaver permanently and lose system access." confirmLabel="Leaver" onConfirm={() => change.mutate({ id: employee.id, status: 'LEAVER' })}>
        Leaver
      </ConfirmActionButton>
    </div>
  );
}

export const assignmentColumns = [
  assignHelper.accessor('project', {
    header: 'Project',
    cell: (info) => <span className="text-neutral-700">{info.getValue()?.code}</span>,
  }),
  assignHelper.accessor('role', {
    header: 'Role',
    cell: (info) => <span className="text-neutral-600">{info.getValue() ?? <EmptyCell />}</span>,
  }),
  assignHelper.accessor('allocationPercent', {
    header: 'Allocation',
    cell: (info) => <span className="font-mono tabular-nums text-neutral-700">{info.getValue()}%</span>,
  }),
  assignHelper.accessor('startDate', {
    header: 'Start',
    cell: (info) => <span className="font-mono text-neutral-600">{formatDate(info.getValue())}</span>,
  }),
  assignHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
];
