import { Badge, EmptyCell } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import type { StockTransfer } from '@aec/api-contracts';
import { formatDateTime } from '@/shared/lib/format';

const columnHelper = createColumnHelper<StockTransfer>();

export const stockTransferColumns = [
  columnHelper.accessor('transferNumber', { header: 'Nomor', cell: (i) => <span className="font-mono text-neutral-800">{i.getValue()}</span> }),
  columnHelper.accessor('fromWarehouse', { header: 'Dari', cell: (i) => <span className="text-neutral-700">{i.getValue()?.code ?? <EmptyCell />}</span> }),
  columnHelper.accessor('toWarehouse', { header: 'Ke', cell: (i) => <span className="text-neutral-700">{i.getValue()?.code ?? <EmptyCell />}</span> }),
  columnHelper.accessor('items', { header: 'Item', cell: (i) => <span className="tabular-nums text-neutral-600">{i.getValue().length} baris</span> }),
  columnHelper.accessor('status', { header: 'Status', cell: (i) => <Badge variant={i.getValue() === 'POSTED' ? 'success' : 'default'}>{i.getValue()}</Badge> }),
  columnHelper.accessor('createdAt', { header: 'Date', cell: (i) => <span className="tabular-nums text-neutral-500">{formatDateTime(i.getValue())}</span> }),
];
