import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, StatusBadge } from '@aec/ui';
import { usePostIntercompany, useCompleteStep, useLockPeriod, useClosePeriod } from '../model/finance-closure.api';
import { formatIdr as fmt } from '@/shared/lib/format';
import type { Intercompany, PeriodClose } from '../model/finance-closure.api';

export type FinanceClosureStatus = 'POSTED' | 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'LOCKED' | 'REVERSED';

function IcActionCell({ row }: { row: { original: Intercompany } }) {
  const post = usePostIntercompany();
  if (row.original.status !== 'DRAFT') return null;
  return (
    <Button size="sm" variant="secondary" loading={post.isPending} onClick={() => post.mutate(row.original.id)}>
      Post
    </Button>
  );
}

function PcActionCell({ row }: { row: { original: PeriodClose } }) {
  const complete = useCompleteStep();
  const lock = useLockPeriod();
  const close = useClosePeriod();
  const { id, status } = row.original;
  if (status === 'OPEN' || status === 'IN_PROGRESS') {
    return (
      <Button size="sm" variant="secondary" loading={complete.isPending} onClick={() => complete.mutate({ id })}>
        Complete
      </Button>
    );
  }
  if (status === 'CLOSED') {
    return (
      <Button size="sm" variant="secondary" loading={lock.isPending} onClick={() => lock.mutate({ id })}>
        Lock
      </Button>
    );
  }
  if (status === 'LOCKED') {
    return (
      <Button size="sm" variant="ghost" loading={close.isPending} onClick={() => close.mutate({ id })}>
        Final Close
      </Button>
    );
  }
  return null;
}

const icHelper = createColumnHelper<Intercompany>();
const pcHelper = createColumnHelper<PeriodClose>();

export const icColumns = [
  icHelper.accessor('transactionNumber', {
    header: 'No.',
    cell: (i) => <span className="font-mono text-neutral-800">{i.getValue()}</span>,
  }),
  icHelper.accessor('fromEntity', {
    header: 'Dari',
    cell: (i) => <span className="font-mono text-neutral-700">{i.getValue()?.code}</span>,
  }),
  icHelper.accessor('toEntity', {
    header: 'Ke',
    cell: (i) => <span className="font-mono text-neutral-700">{i.getValue()?.code}</span>,
  }),
  icHelper.accessor('amount', {
    header: 'Nilai',
    cell: (i) => <span className="font-mono tabular-nums text-neutral-800">{fmt(i.getValue())}</span>,
  }),
  icHelper.accessor('currency', {
    header: 'Mata Uang',
    cell: (i) => <Badge variant="default">{i.getValue()}</Badge>,
  }),
  icHelper.accessor('description', {
    header: 'Keterangan',
    cell: (i) => <span className="max-w-[200px] truncate text-neutral-600">{i.getValue() ?? '-'}</span>,
  }),
  icHelper.accessor('status', {
    header: 'Status',
    cell: (i) => <StatusBadge status={i.getValue()} />,
  }),
  icHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <IcActionCell row={row} />,
  }),
];

export const pcColumns = [
  pcHelper.accessor('legalEntity', {
    header: 'Entity',
    cell: (i) => <span className="font-mono text-neutral-700">{i.getValue()?.code}</span>,
  }),
  pcHelper.accessor('period', {
    header: 'Periode',
    cell: (i) => <span className="font-mono text-neutral-800">{i.getValue()}</span>,
  }),
  pcHelper.accessor('journalCount', {
    header: 'Journal',
    cell: (i) => <span className="font-mono tabular-nums text-neutral-600">{i.getValue()}</span>,
  }),
  pcHelper.accessor('status', {
    header: 'Status',
    cell: (i) => <StatusBadge status={i.getValue()} />,
  }),
  pcHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <PcActionCell row={row} />,
  }),
];
