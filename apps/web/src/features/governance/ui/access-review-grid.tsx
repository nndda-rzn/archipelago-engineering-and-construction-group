import { Button, StatusBadge } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useCompleteAccessReview } from '../model/governance.api';
import type { AccessReview } from '@aec/api-contracts';

const reviewHelper = createColumnHelper<AccessReview>();

function CompleteReviewCell({ review }: { review: AccessReview }) {
  const complete = useCompleteAccessReview();
  if (review.status === 'COMPLETED') return null;
  return <Button size="sm" variant="secondary" loading={complete.isPending} onClick={() => complete.mutate({ id: review.id })}>Selesaikan</Button>;
}

export const reviewColumns = [
  reviewHelper.accessor('reviewNumber', { header: 'No. Review', cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span> }),
  reviewHelper.accessor('period', { header: 'Periode', cell: (info) => <span className="font-mono text-neutral-600">{info.getValue()}</span> }),
  reviewHelper.accessor('status', { header: 'Status', cell: (info) => <StatusBadge status={info.getValue()} /> }),
  reviewHelper.display({ id: 'actions', header: '', cell: ({ row }) => <CompleteReviewCell review={row.original} /> }),
];
