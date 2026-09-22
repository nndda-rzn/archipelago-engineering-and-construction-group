import { EmptyCell, StatusBadge } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import type { Project } from '@aec/api-contracts';
import { formatIdr } from '@/shared/lib/format';
const helper = createColumnHelper<Project>();

export const projectColumns = [
  helper.accessor('code', { header: 'Kode', cell: (i) => <span className="font-mono text-neutral-800">{i.getValue()}</span> }),
  helper.accessor('name', { header: 'Nama Project', cell: (i) => <span className="text-neutral-900">{i.getValue()}</span> }),
  helper.accessor('client', { header: 'Klien', cell: (i) => <span className="text-neutral-600">{i.getValue()}</span> }),
  helper.accessor('location', { header: 'Lokasi', cell: (i) => <span className="text-neutral-600">{i.getValue() ?? <EmptyCell />}</span> }),
  helper.accessor('contractValue', { header: 'Nilai Kontrak', cell: (i) => <span className="font-mono tabular-nums text-neutral-700">{i.getValue() != null ? formatIdr(i.getValue()!) : <EmptyCell />}</span> }),
  helper.accessor('status', { header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> }),
];
