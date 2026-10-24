import { Badge, Button } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useUpdateDeliverableStatus } from '../model/engineering.api';
import type { Deliverable } from '@aec/api-contracts';
import { engStatusVariant, EngDateCell, type EngStatus } from './engineering-shared';

const dlvHelper = createColumnHelper<Deliverable>();

export function DlvAdvanceBtn({ row }: { row: Deliverable }) {
  const update = useUpdateDeliverableStatus();
  // Kata kerja manusia, bukan kode enum. Dulu tombol berlabel "IN_PROGRESS" dll.
  const next: Record<string, { to: string; verb: string }> = {
    NOT_STARTED: { to: 'IN_PROGRESS', verb: 'Start' },
    IN_PROGRESS: { to: 'SUBMITTED', verb: 'Submit' },
    SUBMITTED: { to: 'APPROVED', verb: 'Approve' },
    APPROVED: { to: 'ISSUED', verb: 'Issue' },
  };
  const step = next[row.status];
  if (!step) return null;
  return (
    <Button size="sm" variant="secondary" loading={update.isPending} onClick={() => update.mutate({ id: row.id, status: step.to })}>
      {step.verb}
    </Button>
  );
}

export const dlvColumns = [
  dlvHelper.accessor('deliverableNumber', { header: 'No.', cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span> }),
  dlvHelper.accessor('title', { header: 'Deliverable', cell: (info) => <span className="max-w-xs truncate text-neutral-800">{info.getValue()}</span> }),
  dlvHelper.accessor((row) => row.project?.code ?? '—', { id: 'project', header: 'Project', cell: (info) => <span className="font-mono text-caption text-neutral-600">{info.getValue()}</span> }),
  dlvHelper.accessor('discipline', { header: 'Discipline', cell: (info) => <Badge variant="default">{info.getValue()}</Badge> }),
  dlvHelper.accessor('engineer', { header: 'Engineer', cell: (info) => <span className="text-neutral-600">{info.getValue()}</span> }),
  // `forecastDate` kosong di seluruh data (0 dari 11); `plannedDate` terisi 11/11.
  dlvHelper.accessor('plannedDate', { header: 'Planned', cell: (info) => <EngDateCell value={info.getValue()} /> }),
  dlvHelper.accessor('status', { header: 'Status', cell: ({ row }) => <Badge variant={engStatusVariant[row.original.status as EngStatus]}>{row.original.status}</Badge> }),
  dlvHelper.display({ id: 'actions', header: '', cell: ({ row }) => <DlvAdvanceBtn row={row.original} /> }),
];
