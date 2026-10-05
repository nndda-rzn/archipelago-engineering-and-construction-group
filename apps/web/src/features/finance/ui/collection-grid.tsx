import { ConfirmActionButton, EmptyCell, StatusBadge } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { usePostCollection } from '../model/collection.api';
import type { Collection } from '@aec/api-contracts';
import { formatIdr as fmt } from '@/shared/lib/format';

export type CollectionStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';

const columnHelper = createColumnHelper<Collection>();

export const collectionColumns = [
  columnHelper.accessor('collectionNumber', {
    header: 'No. Collection',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  columnHelper.accessor('client', {
    header: 'Client',
    cell: (info) => <span className="text-neutral-700">{info.getValue()}</span>,
  }),
  columnHelper.accessor('totalAmount', {
    header: 'Total',
    cell: (info) => <span className="font-mono tabular-nums text-neutral-700">{fmt(info.getValue())}</span>,
  }),
  columnHelper.accessor('reference', {
    header: 'Reference',
    cell: (info) => <span className="font-mono text-neutral-600">{info.getValue() ?? <EmptyCell />}</span>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <PostButton collection={row.original} />,
  }),
];

function PostButton({ collection }: { collection: Collection }) {
  const post = usePostCollection();
  if (collection.status !== 'DRAFT') return null;
  return (
    <ConfirmActionButton
      size="sm"
      variant="secondary"
      confirmTitle="Post collection"
      confirmDescription={`Post ${collection.collectionNumber}? Auto-GL: Dr Cash, Cr Receivable.`}
      confirmLabel="Post"
      onConfirm={() => post.mutate(collection.id)}
      loading={post.isPending}
    >
      Post
    </ConfirmActionButton>
  );
}
