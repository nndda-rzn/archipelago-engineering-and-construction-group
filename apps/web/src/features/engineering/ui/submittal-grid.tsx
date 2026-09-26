import { Badge, Button, EmptyCell } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useReviewSubmittal } from '../model/engineering.api';
import type { Submittal } from '@aec/api-contracts';
import { engStatusVariant, EngDateCell, type EngStatus } from './engineering-shared';

const subHelper = createColumnHelper<Submittal>();

export function SubReviewBtn({ row }: { row: Submittal }) {
  const review = useReviewSubmittal();
  if (row.status !== 'SUBMITTED') return null;
  return (
    <Button size="sm" variant="secondary" loading={review.isPending} onClick={() => review.mutate({ id: row.id, status: 'APPROVED' })}>
      Approve
    </Button>
  );
}

export const subColumns = [
  subHelper.accessor('submittalNumber', { header: 'No.', cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span> }),
  subHelper.accessor('title', { header: 'Submittal', cell: (info) => <span className="max-w-xs truncate text-neutral-800">{info.getValue()}</span> }),
  subHelper.accessor('reviewedBy', { header: 'Reviewer', cell: (info) => <span className="text-neutral-600">{info.getValue() ?? <EmptyCell />}</span> }),
  subHelper.accessor('dueDate', { header: 'Due', cell: (info) => <EngDateCell value={info.getValue()} /> }),
  subHelper.accessor('status', { header: 'Status', cell: ({ row }) => <Badge variant={engStatusVariant[row.original.status as EngStatus]}>{row.original.status}</Badge> }),
  subHelper.display({ id: 'actions', header: '', cell: ({ row }) => <SubReviewBtn row={row.original} /> }),
];
