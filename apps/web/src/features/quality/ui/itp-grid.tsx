import { Badge } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import type { Itp } from '@aec/api-contracts';
import { statusVariant, type QualityStatus } from './quality-status';

const itpHelper = createColumnHelper<Itp>();

export const itpColumns = [
  itpHelper.accessor('itpNumber', { header: 'No. ITP', cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span> }),
  itpHelper.accessor('title', { header: 'Judul', cell: (info) => <span className="text-neutral-800">{info.getValue()}</span> }),
  itpHelper.accessor('workPackage', { header: 'Work Package', cell: (info) => <span className="font-mono text-neutral-600">{info.getValue()?.wpNumber ?? '-'}</span> }),
  itpHelper.accessor('status', { header: 'Status', cell: ({ row }) => <Badge variant={statusVariant[row.original.status as QualityStatus]}>{row.original.status}</Badge> }),
];
