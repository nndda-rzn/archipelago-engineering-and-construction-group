import { Badge, DataGrid, EmptyCell } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import type { VendorRating } from '@/features/procurement';

const ratingHelper = createColumnHelper<VendorRating>();

export const ratingColumns = [
  ratingHelper.accessor('vendor', { header: 'Vendor', cell: (i) => <span className="text-neutral-800">{i.getValue()?.name}</span> }),
  ratingHelper.accessor('category', { header: 'Category', cell: (i) => <Badge variant="default">{i.getValue()}</Badge> }),
  ratingHelper.accessor('score', { header: 'Score', cell: (i) => <span className="font-mono tabular-nums text-neutral-800">{i.getValue()}/5</span> }),
  ratingHelper.accessor('remark', { header: 'Remark', cell: (i) => <span className="max-w-[200px] truncate text-neutral-600">{i.getValue() ?? <EmptyCell />}</span> }),
  ratingHelper.accessor('project', { header: 'Project', cell: (i) => <span className="font-mono text-neutral-600">{i.getValue()?.code ?? <EmptyCell />}</span> }),
];

type PaginationState = { pageIndex: number; pageSize: number };

export function VendorRatingGrid({
  data,
  total,
  isLoading,
  isError,
  onRetry,
  pagination,
  onPaginationChange,
}: {
  data: VendorRating[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  pagination: PaginationState;
  onPaginationChange: (p: PaginationState) => void;
}) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
      <DataGrid
        columns={ratingColumns}
        data={data}
        rowCount={total}
        isLoading={isLoading}
        isError={isError}
        onRetry={onRetry}
        emptyMessage="No ratings yet"
        pagination={pagination}
        onPaginationChange={onPaginationChange}
      />
    </div>
  );
}
