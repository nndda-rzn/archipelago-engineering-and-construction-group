import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, EmptyCell, StatusBadge } from '@aec/ui';
import {
  useCompleteEquipmentPm, useEndEquipmentAssignment, useResolveEquipmentBreakdown,
} from '../model/hcm.api';
import type { Equipment, EquipmentAssignment, EquipmentBreakdown, EquipmentPm } from '@aec/api-contracts';
import { formatDate, formatIdr as fmt } from '@/shared/lib/format';

const columnHelper = createColumnHelper<Equipment>();
const assignHelper = createColumnHelper<EquipmentAssignment>();
const pmHelper = createColumnHelper<EquipmentPm>();
const bdHelper = createColumnHelper<EquipmentBreakdown>();

export const equipmentColumns = [
  columnHelper.accessor('equipmentNumber', {
    header: 'Equipment No.',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  columnHelper.accessor('name', {
    header: 'Name',
    cell: (info) => <span className="text-neutral-800 font-medium">{info.getValue()}</span>,
  }),
  columnHelper.accessor('category', {
    header: 'Category',
    cell: (info) => <Badge variant="default">{info.getValue()}</Badge>,
  }),
  columnHelper.accessor('serialNumber', {
    header: 'Serial',
    cell: (info) => <span className="font-mono text-neutral-600">{info.getValue() ?? <EmptyCell />}</span>,
  }),
  columnHelper.accessor('currentMeter', {
    header: 'Meter',
    cell: (info) => <span className="font-mono tabular-nums text-neutral-700">{Number(info.getValue()).toLocaleString('id-ID')} hrs</span>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  }),
];

export const assignmentColumns = [
  assignHelper.accessor('project', {
    header: 'Project',
    cell: (info) => <span className="text-neutral-700">{info.getValue()?.code}</span>,
  }),
  assignHelper.accessor('startDate', {
    header: 'Start',
    cell: (info) => <span className="font-mono text-neutral-600">{formatDate(info.getValue())}</span>,
  }),
  assignHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  assignHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <EndAssignmentCell assignment={row.original} />,
  }),
];

function EndAssignmentCell({ assignment }: { assignment: EquipmentAssignment }) {
  const end = useEndEquipmentAssignment();
  if (assignment.status !== 'ACTIVE') return null;
  return <Button size="sm" variant="ghost" loading={end.isPending} onClick={() => end.mutate({ equipmentId: assignment.equipmentId, assignmentId: assignment.id })}>End</Button>;
}

export const pmColumns = [
  pmHelper.accessor('triggerType', {
    header: 'Trigger',
    cell: (info) => <Badge variant="default">{info.getValue()}</Badge>,
  }),
  pmHelper.accessor('dueDate', {
    header: 'Due Date',
    cell: (info) => {
      const due = info.getValue();
      return <span className="font-mono text-neutral-600">{formatDate(due)}</span>;
    },
  }),
  pmHelper.accessor('dueMeter', {
    header: 'Due Meter',
    cell: (info) => (info.getValue() != null ? <span className="font-mono tabular-nums text-neutral-700">{info.getValue()} hrs</span> : <EmptyCell />),
  }),
  pmHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  pmHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <CompletePmCell pm={row.original} />,
  }),
];

function CompletePmCell({ pm }: { pm: EquipmentPm }) {
  const complete = useCompleteEquipmentPm();
  if (pm.status !== 'SCHEDULED') return null;
  return <Button size="sm" variant="secondary" loading={complete.isPending} onClick={() => complete.mutate({ equipmentId: pm.equipmentId, pmId: pm.id })}>Complete</Button>;
}

export const breakdownColumns = [
  bdHelper.accessor('breakdownDate', {
    header: 'Date',
    cell: (info) => <span className="font-mono text-neutral-600">{formatDate(info.getValue())}</span>,
  }),
  bdHelper.accessor('downtimeHours', {
    header: 'Downtime (hrs)',
    cell: (info) => <span className="font-mono tabular-nums text-neutral-700">{info.getValue()}</span>,
  }),
  bdHelper.accessor('costImpact', {
    header: 'Cost Impact',
    cell: (info) => <span className="font-mono tabular-nums text-destructive-600">{fmt(info.getValue())}</span>,
  }),
  bdHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  bdHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <ResolveBreakdownCell breakdown={row.original} />,
  }),
];

function ResolveBreakdownCell({ breakdown }: { breakdown: EquipmentBreakdown }) {
  const resolve = useResolveEquipmentBreakdown();
  if (breakdown.status !== 'OPEN') return null;
  return <Button size="sm" variant="secondary" loading={resolve.isPending} onClick={() => resolve.mutate({ equipmentId: breakdown.equipmentId, breakdownId: breakdown.id })}>Resolve</Button>;
}
