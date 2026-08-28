import { Badge, Button, type BadgeVariant } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useChangeEmployeeStatus } from '../model/hcm.api';
import type { Employee, ProjectAssignment } from '@aec/api-contracts';

type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'LEAVER';

export const statusVariant: Record<EmployeeStatus, BadgeVariant> = {
  ACTIVE: 'success',
  INACTIVE: 'warning',
  LEAVER: 'warning',
};

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
    cell: (info) => <span className="font-mono text-neutral-600">{info.getValue() ?? '-'}</span>,
  }),
  columnHelper.accessor('department', {
    header: 'Departemen',
    cell: (info) => <span className="text-neutral-600">{info.getValue() ?? '-'}</span>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: ({ row }) => <Badge variant={statusVariant[row.original.status as EmployeeStatus]}>{row.original.status}</Badge>,
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
  return (
    <div className="flex items-center gap-1">
      {employee.status === 'INACTIVE' ? (
        <Button size="sm" variant="ghost" loading={change.isPending} onClick={() => change.mutate({ id: employee.id, status: 'ACTIVE' })}>
          Aktifkan
        </Button>
      ) : (
        <Button size="sm" variant="ghost" loading={change.isPending} onClick={() => change.mutate({ id: employee.id, status: 'INACTIVE' })}>
          Nonaktifkan
        </Button>
      )}
      <Button size="sm" variant="ghost" className="text-destructive-600" loading={change.isPending} onClick={() => change.mutate({ id: employee.id, status: 'LEAVER' })}>
        Leaver
      </Button>
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
    cell: (info) => <span className="text-neutral-600">{info.getValue() ?? '-'}</span>,
  }),
  assignHelper.accessor('allocationPercent', {
    header: 'Alokasi',
    cell: (info) => <span className="font-mono tabular-nums text-neutral-700">{info.getValue()}%</span>,
  }),
  assignHelper.accessor('startDate', {
    header: 'Mulai',
    cell: (info) => <span className="font-mono text-neutral-600">{new Date(info.getValue()).toLocaleDateString('id-ID')}</span>,
  }),
  assignHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={info.getValue() === 'ACTIVE' ? 'success' : 'default'}>{info.getValue()}</Badge>,
  }),
];
