import { Badge, Button } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useUpdateLegalCaseStatus } from '../model/governance.api';
import type { LegalCase } from '@aec/api-contracts';
import { statusVariant } from './governance-status';

const legalHelper = createColumnHelper<LegalCase>();

function LegalCaseActions({ legal }: { legal: LegalCase }) {
  const update = useUpdateLegalCaseStatus();
  if (['WON', 'LOST', 'SETTLED'].includes(legal.status)) return null;
  return (
    <div className="flex items-center gap-1">
      <Button size="sm" variant="secondary" loading={update.isPending} onClick={() => update.mutate({ id: legal.id, status: 'IN_PROGRESS' })}>Proses</Button>
      <Button size="sm" variant="ghost" loading={update.isPending} onClick={() => update.mutate({ id: legal.id, status: 'SETTLED' })}>Selesai</Button>
    </div>
  );
}

export const legalColumns = [
  legalHelper.accessor('caseNumber', { header: 'No. Kasus', cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span> }),
  legalHelper.accessor('title', { header: 'Judul', cell: (info) => <span className="max-w-xs truncate text-neutral-800">{info.getValue()}</span> }),
  legalHelper.accessor('caseType', { header: 'Tipe', cell: (info) => <Badge variant="default">{info.getValue()}</Badge> }),
  legalHelper.accessor('counterpart', { header: 'Pihak Lawan', cell: (info) => <span className="text-neutral-600">{info.getValue() ?? '-'}</span> }),
  legalHelper.accessor('status', { header: 'Status', cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge> }),
  legalHelper.display({ id: 'actions', header: '', cell: ({ row }) => <LegalCaseActions legal={row.original} /> }),
];
