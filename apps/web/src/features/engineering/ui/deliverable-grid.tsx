import { Badge, Button } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useUpdateDeliverableStatus } from '../model/engineering.api';
import type { Deliverable } from '@aec/api-contracts';
import { engStatusVariant, EngDateCell } from './engineering-shared';

const dlvHelper = createColumnHelper<Deliverable>();

export function DlvAdvanceBtn({ row }: { row: Deliverable }) {
  const update = useUpdateDeliverableStatus();
  const next: Record<string, string> = {
    NOT_STARTED: 'IN_PROGRESS',
    IN_PROGRESS: 'SUBMITTED',
    SUBMITTED: 'APPROVED',
    APPROVED: 'ISSUED',
  };
  const to = next[row.status];
  if (!to) return null;
  return (
    <Button size="sm" variant="secondary" loading={update.isPending} onClick={() => update.mutate({ id: row.id, status: to })}>
      {to}
    </Button>
  );
}

export const dlvColumns = [
  dlvHelper.accessor('deliverableNumber', { header: 'No.', cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span> }),
  dlvHelper.accessor('title', { header: 'Deliverable', cell: (info) => <span className="max-w-xs truncate text-neutral-800">{info.getValue()}</span> }),
  dlvHelper.accessor('discipline', { header: 'Disiplin', cell: (info) => <Badge variant="default">{info.getValue()}</Badge> }),
  dlvHelper.accessor('engineer', { header: 'Engineer', cell: (info) => <span className="text-neutral-600">{info.getValue()}</span> }),
  dlvHelper.accessor('forecastDate', { header: 'Forecast', cell: (info) => <EngDateCell value={info.getValue()} /> }),
  dlvHelper.accessor('status', { header: 'Status', cell: (info) => <Badge variant={engStatusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge> }),
  dlvHelper.display({ id: 'actions', header: '', cell: ({ row }) => <DlvAdvanceBtn row={row.original} /> }),
];
