import { Badge, ConfirmActionButton, EmptyCell, StatusBadge } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useApproveStockAdjustment } from '../model/stock-adjustment.api';
import type { StockAdjustment } from '@aec/api-contracts';


const columnHelper = createColumnHelper<StockAdjustment>();

export const adjustmentColumns = [
  columnHelper.accessor('adjustmentNumber', {
    header: 'Nomor',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  columnHelper.accessor('warehouse', {
    header: 'Warehouse',
    cell: (info) => <span className="text-neutral-700">{info.getValue()?.code ?? <EmptyCell />}</span>,
  }),
  columnHelper.accessor('reasonCode', {
    header: 'Reason',
    cell: (info) => <Badge variant={info.getValue() === 'SURPLUS' ? 'success' : 'default'}>{info.getValue()}</Badge>,
  }),
  columnHelper.accessor('items', {
    header: 'Item',
    cell: (info) => <span className="tabular-nums text-neutral-600">{info.getValue().length} baris</span>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <ApproveButton adj={row.original} />,
  }),
];

function ApproveButton({ adj }: { adj: StockAdjustment }) {
  const approve = useApproveStockAdjustment();
  if (adj.status !== 'DRAFT') return null;
  return (
    <ConfirmActionButton
      size="sm"
      variant="secondary"
      confirmTitle="Approve adjustment"
      confirmDescription={`Approve ${adj.adjustmentNumber}? Stock will be updated.`}
      confirmLabel="Approve"
      onConfirm={() => approve.mutate(adj.id)}
      loading={approve.isPending}
    >
      Approve
    </ConfirmActionButton>
  );
}
