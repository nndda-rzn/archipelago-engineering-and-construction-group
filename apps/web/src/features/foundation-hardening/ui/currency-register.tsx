import type { Currency } from '@aec/api-contracts';
import { DataGrid, EmptyCell, type DataGridProps } from '@aec/ui';
import { useSetCurrencyStatus } from '../model/foundation-hardening.api';

/** Register mata uang: kode, nama, symbol, decimals, status + aktif-nonaktif. */
export function CurrencyRegister({ currencies }: { currencies: Currency[] }) {
  const setStatus = useSetCurrencyStatus();
  const columns: DataGridProps<Currency>['columns'] = [
    { id: 'code', header: 'Code', size: 100, cell: ({ row }) => <span className="font-mono text-neutral-800">{row.original.code}</span> },
    { id: 'name', header: 'Name', size: 200, cell: ({ row }) => <span className="text-neutral-700">{row.original.name}</span> },
    { id: 'symbol', header: 'Symbol', size: 90, cell: ({ row }) => <span className="font-mono text-neutral-600">{row.original.symbol || <EmptyCell />}</span> },
    { id: 'decimals', header: 'Decimals', size: 90, meta: { align: 'right' as const }, cell: ({ row }) => <span className="font-mono tabular-nums text-neutral-600">{row.original.decimals}</span> },
    { id: 'status', header: 'Status', size: 110, cell: ({ row }) => <span className={row.original.isActive ? 'text-success-700' : 'text-neutral-500'}>{row.original.isActive ? 'ACTIVE' : 'INACTIVE'}</span> },
    {
      id: 'action',
      header: '',
      size: 120,
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => setStatus.mutate({ id: row.original.id, status: row.original.isActive ? 'INACTIVE' : 'ACTIVE' })}
          className="rounded px-1.5 py-0.5 text-caption text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
        >
          {row.original.isActive ? 'Deactivate' : 'Activate'}
        </button>
      ),
    },
  ];
  return <DataGrid columns={columns} data={currencies} getRowId={(r) => r.id} emptyMessage="No currencies yet" hideToolbar />;
}
