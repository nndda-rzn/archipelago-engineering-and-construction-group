import { EmptyCell, StatusBadge } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import type { Client } from '@aec/api-contracts';

const clientHelper = createColumnHelper<Client>();

export const clientColumns = [
  clientHelper.accessor('clientCode', { header: 'Code', cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span> }),
  clientHelper.accessor('name', { header: 'Client', cell: (info) => <span className="text-neutral-800 font-medium">{info.getValue()}</span> }),
  clientHelper.accessor('industry', { header: 'Industry', cell: (info) => <span className="text-neutral-600">{info.getValue() ?? <EmptyCell />}</span> }),
  clientHelper.accessor('contactPerson', { header: 'Contact', cell: (info) => <span className="text-neutral-600">{info.getValue() ?? <EmptyCell />}</span> }),
  clientHelper.accessor('email', { header: 'Email', cell: (info) => <span className="font-mono text-neutral-500">{info.getValue() ?? <EmptyCell />}</span> }),
  clientHelper.accessor('status', { header: 'Status', cell: (info) => <StatusBadge status={info.getValue()} /> }),
];
