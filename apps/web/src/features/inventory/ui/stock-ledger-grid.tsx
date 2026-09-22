import { Badge, type BadgeVariant } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import type { StockLedgerEntry } from '@aec/api-contracts';
import { formatDateTime } from '@/shared/lib/format';

type MovementType = 'IN' | 'OUT' | 'ADJUST';

export const movementVariant: Record<MovementType, BadgeVariant> = {
  IN: 'success',
  OUT: 'warning',
  ADJUST: 'default',
};

const columnHelper = createColumnHelper<StockLedgerEntry>();

export const ledgerColumns = [
  columnHelper.accessor('createdAt', {
    header: 'Tanggal',
    cell: (info) => <span className="tabular-nums text-neutral-500">{formatDateTime(info.getValue())}</span>,
  }),
  columnHelper.accessor('documentType', {
    header: 'Dokumen',
    cell: (info) => <Badge variant="default">{info.getValue()}</Badge>,
  }),
  columnHelper.accessor('reference', {
    header: 'Referensi',
    cell: (info) => <span className="font-mono text-neutral-700">{info.getValue() ?? '-'}</span>,
  }),
  columnHelper.accessor('wbsItem', {
    header: 'WBS',
    cell: (info) => <span className="text-neutral-600">{info.getValue() ? `${info.getValue()?.code} — ${info.getValue()?.name}` : '-'}</span>,
  }),
  columnHelper.accessor('movementType', {
    header: 'Jenis',
    cell: (info) => <Badge variant={movementVariant[info.getValue() as MovementType]}>{info.getValue()}</Badge>,
  }),
  columnHelper.accessor('quantity', {
    header: 'Qty',
    cell: (info) => (
      <span className={`font-mono tabular-nums ${info.getValue() >= 0 ? 'text-financial-positive-500' : 'text-destructive-600'}`}>
        {info.getValue() >= 0 ? '+' : ''}{info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor('unit', {
    header: 'Unit',
    cell: (info) => <span className="text-neutral-600">{info.getValue()}</span>,
  }),
  columnHelper.accessor('balanceAfter', {
    header: 'Saldo',
    cell: (info) => <span className="font-mono tabular-nums text-neutral-800">{info.getValue()}</span>,
  }),
];
