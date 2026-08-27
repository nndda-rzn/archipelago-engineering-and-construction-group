import { Badge, Button } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useAnswerRfi } from '../model/engineering.api';
import type { Rfi } from '@aec/api-contracts';
import { engStatusVariant, EngDateCell } from './engineering-shared';

const rfiHelper = createColumnHelper<Rfi>();

export function RfiAnswerBtn({ row }: { row: Rfi }) {
  const answer = useAnswerRfi();
  if (row.status !== 'OPEN') return null;
  return (
    <Button size="sm" variant="secondary" loading={answer.isPending} onClick={() => answer.mutate({ id: row.id, answer: 'Answered' })}>
      Answer
    </Button>
  );
}

export const rfiColumns = [
  rfiHelper.accessor('rfiNumber', { header: 'No.', cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span> }),
  rfiHelper.accessor('title', { header: 'Subjek', cell: (info) => <span className="max-w-xs truncate text-neutral-800">{info.getValue()}</span> }),
  rfiHelper.accessor('createdBy', { header: 'Dari', cell: (info) => <span className="text-neutral-600">{info.getValue()}</span> }),
  rfiHelper.accessor('createdAt', { header: 'Tanggal', cell: (info) => <EngDateCell value={info.getValue()} /> }),
  rfiHelper.accessor('status', { header: 'Status', cell: (info) => <Badge variant={engStatusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge> }),
  rfiHelper.display({ id: 'actions', header: '', cell: ({ row }) => <RfiAnswerBtn row={row.original} /> }),
];
