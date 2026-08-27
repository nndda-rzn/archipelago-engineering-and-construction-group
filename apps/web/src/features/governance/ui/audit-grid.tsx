import { Badge, Button } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useAdvanceAudit } from '../model/governance.api';
import type { AuditEngagement } from '@aec/api-contracts';
import { statusVariant } from './governance-status';

const auditHelper = createColumnHelper<AuditEngagement>();

function AdvanceAuditCell({ audit }: { audit: AuditEngagement }) {
  const advance = useAdvanceAudit();
  const next: Record<string, string> = { PLANNED: 'FIELDWORK', FIELDWORK: 'FINDINGS', FINDINGS: 'CLOSED' };
  const to = next[audit.status];
  if (!to) return null;
  return <Button size="sm" variant="secondary" loading={advance.isPending} onClick={() => advance.mutate({ id: audit.id, status: to })}>→ {to}</Button>;
}

export const auditColumns = [
  auditHelper.accessor('auditNumber', { header: 'No. Audit', cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span> }),
  auditHelper.accessor('title', { header: 'Judul', cell: (info) => <span className="text-neutral-800">{info.getValue()}</span> }),
  auditHelper.accessor('status', { header: 'Status', cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge> }),
  auditHelper.display({ id: 'actions', header: '', cell: ({ row }) => <AdvanceAuditCell audit={row.original} /> }),
];
