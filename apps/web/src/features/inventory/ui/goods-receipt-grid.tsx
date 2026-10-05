import { Badge, EmptyCell } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import type { GoodsReceipt } from '@aec/api-contracts';
import { formatDate } from '@/shared/lib/format';

const columnHelper = createColumnHelper<GoodsReceipt>();

export const goodsReceiptColumns = [
  columnHelper.accessor('grNumber', { header: 'GR Number', cell: (i) => <span className="font-mono text-neutral-800">{i.getValue()}</span> }),
  columnHelper.accessor('po', { header: 'From PO', cell: (i) => <span className="font-mono text-neutral-700">{i.getValue()?.poNumber ?? <EmptyCell />}</span> }),
  columnHelper.accessor('warehouse', { header: 'Warehouse', cell: (i) => <span className="text-neutral-700">{i.getValue()?.code ?? <EmptyCell />}</span> }),
  columnHelper.accessor('items', { header: 'Items', cell: (i) => <span className="tabular-nums text-neutral-600">{i.getValue().length} rows</span> }),
  columnHelper.accessor('receivedBy', { header: 'Received By', cell: (i) => <span className="text-neutral-600">{i.getValue()}</span> }),
  columnHelper.accessor('status', { header: 'Status', cell: (i) => <Badge variant={i.getValue() === 'POSTED' ? 'success' : 'default'}>{i.getValue()}</Badge> }),
  columnHelper.accessor('createdAt', { header: 'Date', cell: (i) => <span className="tabular-nums text-neutral-500">{formatDate(i.getValue())}</span> }),
];
