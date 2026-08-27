import { Badge } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import type { GoodsReceipt } from '@aec/api-contracts';

const columnHelper = createColumnHelper<GoodsReceipt>();

export const goodsReceiptColumns = [
  columnHelper.accessor('grNumber', { header: 'Nomor GR', cell: (i) => <span className="font-mono text-neutral-800">{i.getValue()}</span> }),
  columnHelper.accessor('po', { header: 'Dari PO', cell: (i) => <span className="font-mono text-neutral-700">{i.getValue()?.poNumber ?? '-'}</span> }),
  columnHelper.accessor('warehouse', { header: 'Warehouse', cell: (i) => <span className="text-neutral-700">{i.getValue()?.code ?? '-'}</span> }),
  columnHelper.accessor('items', { header: 'Item', cell: (i) => <span className="tabular-nums text-neutral-600">{i.getValue().length} baris</span> }),
  columnHelper.accessor('receivedBy', { header: 'Diterima Oleh', cell: (i) => <span className="text-neutral-600">{i.getValue()}</span> }),
  columnHelper.accessor('status', { header: 'Status', cell: (i) => <Badge variant={i.getValue() === 'POSTED' ? 'success' : 'default'}>{i.getValue()}</Badge> }),
  columnHelper.accessor('createdAt', { header: 'Tanggal', cell: (i) => <span className="tabular-nums text-neutral-500">{new Date(i.getValue()).toLocaleDateString('id-ID')}</span> }),
];
