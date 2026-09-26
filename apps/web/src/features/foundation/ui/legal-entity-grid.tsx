import { StatusBadge } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import type { LegalEntity } from '@aec/api-contracts';

const columnHelper = createColumnHelper<LegalEntity>();

export const legalEntityColumns = [
  columnHelper.accessor('code', { header: 'Kode', enableSorting: true, cell: (i) => <span className="font-mono text-neutral-800">{i.getValue()}</span> }),
  columnHelper.accessor('legalName', { header: 'Nama Legal', enableSorting: true, cell: (i) => <span className="text-neutral-900">{i.getValue()}</span> }),
  columnHelper.accessor('taxIdentifier', { header: 'NPWP', enableSorting: true, cell: (i) => <span className="font-mono text-neutral-600">{i.getValue()}</span> }),
  columnHelper.accessor('country', { header: 'Negara', enableSorting: true, cell: (i) => <span className="text-neutral-600">{i.getValue()}</span> }),
  columnHelper.accessor('functionalCurrency', { header: 'Mata Uang', enableSorting: true, cell: (i) => <span className="font-mono text-neutral-600">{i.getValue()}</span> }),
  columnHelper.accessor('status', { header: 'Status', enableSorting: true, cell: (i) => <StatusBadge status={i.getValue()} /> }),
];
