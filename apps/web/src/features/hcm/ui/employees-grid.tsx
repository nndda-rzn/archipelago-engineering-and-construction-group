import { Button, ConfirmActionButton, EmptyCell, StatusBadge } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useChangeEmployeeStatus } from '../model/hcm.api';
import type { Employee, ProjectAssignment } from '@aec/api-contracts';
import { formatDate } from '@/shared/lib/format';

const columnHelper = createColumnHelper<Employee>();
const assignHelper = createColumnHelper<ProjectAssignment>();

export const employeeColumns = [
  columnHelper.accessor('employeeNumber', {
    header: 'No. Karyawan',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  columnHelper.accessor('name', {
    header: 'Nama',
    cell: (info) => <span className="text-neutral-800 font-medium">{info.getValue()}</span>,
  }),
  columnHelper.accessor('position', {
    header: 'Posisi',
    cell: (info) => <span className="text-neutral-700">{info.getValue()}</span>,
  }),
  columnHelper.accessor('grade', {
    header: 'Grade',
    cell: (info) => <span className="font-mono text-neutral-600">{info.getValue() ?? <EmptyCell />}</span>,
  }),
  columnHelper.accessor('department', {
    header: 'Departemen',
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
          Aktifkan
        </Button>
      ) : (
        <ConfirmActionButton size="sm" variant="ghost" loading={pendingFor('INACTIVE')} confirmTitle="Nonaktifkan karyawan?" confirmDescription="Karyawan akan berstatus nonaktif." confirmLabel="Nonaktifkan" onConfirm={() => change.mutate({ id: employee.id, status: 'INACTIVE' })}>
          Nonaktifkan
        </ConfirmActionButton>
      )}
      <ConfirmActionButton size="sm" variant="ghost" className="text-destructive-600" loading={pendingFor('LEAVER')} confirmTitle="Ubah ke Leaver?" confirmDescription="Karyawan akan berstatus Leaver secara permanen dan kehilangan akses sistem." confirmLabel="Leaver" onConfirm={() => change.mutate({ id: employee.id, status: 'LEAVER' })}>
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
    header: 'Peran',
    cell: (info) => <span className="text-neutral-600">{info.getValue() ?? <EmptyCell />}</span>,
  }),
  assignHelper.accessor('allocationPercent', {
    header: 'Alokasi',
    cell: (info) => <span className="font-mono tabular-nums text-neutral-700">{info.getValue()}%</span>,
  }),
  assignHelper.accessor('startDate', {
    header: 'Mulai',
    cell: (info) => <span className="font-mono text-neutral-600">{formatDate(info.getValue())}</span>,
  }),
  assignHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
];
