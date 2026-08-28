import { Badge, Button } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useRespondFinding } from '../model/governance.api';
import type { AuditFinding } from '@aec/api-contracts';
import { statusVariant } from './governance-status';
import type { GovernanceStatus } from './governance-status';

const findingHelper = createColumnHelper<AuditFinding>();

function RespondFindingCell({ finding }: { finding: AuditFinding }) {
  const respond = useRespondFinding();
  if (finding.status === 'VERIFIED') return null;
  return (
    <div className="flex items-center gap-1">
      <Button size="sm" variant="secondary" loading={respond.isPending} onClick={() => respond.mutate({ id: finding.id, response: 'diterima', status: 'ACCEPTED' })}>Terima</Button>
      <Button size="sm" variant="ghost" loading={respond.isPending} onClick={() => respond.mutate({ id: finding.id, status: 'VERIFIED' })}>Verified</Button>
    </div>
  );
}

export const findingColumns = [
  findingHelper.accessor('title', { header: 'Finding', cell: (info) => <span className="text-neutral-700">{info.getValue()}</span> }),
  findingHelper.accessor('severity', { header: 'Severity', cell: (info) => <Badge variant={info.getValue() === 'HIGH' ? 'warning' : 'default'}>{info.getValue()}</Badge> }),
  findingHelper.accessor('response', { header: 'Respons', cell: (info) => <span className="max-w-xs truncate text-neutral-600">{info.getValue() ?? '-'}</span> }),
  findingHelper.accessor('status', { header: 'Status', cell: (info) => <Badge variant={statusVariant[info.getValue() as GovernanceStatus]}>{info.getValue()}</Badge> }),
  findingHelper.display({ id: 'actions', header: '', cell: ({ row }) => <RespondFindingCell finding={row.original} /> }),
];
