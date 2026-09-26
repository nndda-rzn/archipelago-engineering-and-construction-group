import { Badge, EmptyCell, StatusBadge } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import type { StockOpname } from '@aec/api-contracts';


const columnHelper = createColumnHelper<StockOpname>();

export const opnameColumns = [
  columnHelper.accessor('opnameNumber', { header: 'Nomor', cell: (i) => <span className="font-mono text-neutral-800">{i.getValue()}</span> }),
  columnHelper.accessor('warehouse', { header: 'Warehouse', cell: (i) => <span className="text-neutral-700">{i.getValue()?.code ?? <EmptyCell />}</span> }),
  columnHelper.accessor('countedBy', { header: 'Pencatat', cell: (i) => <span className="text-neutral-600">{i.getValue()}</span> }),
  columnHelper.accessor('items', { header: 'Item', cell: (i) => <span className="tabular-nums text-neutral-600">{i.getValue().length} baris</span> }),
  columnHelper.accessor('status', { header: 'Status', cell: (i) => <StatusBadge status={i.getValue()} /> }),
  columnHelper.accessor('items', {
    id: 'diff',
    header: 'Selisih',
    cell: (i) => {
      const diffs = i.getValue().filter((item) => item.difference !== 0).length;
      return diffs > 0 ? <Badge variant="warning">{diffs} item beda</Badge> : <Badge variant="success">Sesuai</Badge>;
    },
  }),
];
