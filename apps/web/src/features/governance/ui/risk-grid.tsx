import { Badge, Button } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useMitigateRisk } from '../model/governance.api';
import type { Risk } from '@aec/api-contracts';
import { statusVariant } from './governance-status';
import type { GovernanceStatus } from './governance-status';

const riskHelper = createColumnHelper<Risk>();

function MitigateRiskCell({ risk }: { risk: Risk }) {
  const mitigate = useMitigateRisk();
  if (risk.status === 'CLOSED' || risk.status === 'MITIGATED') return null;
  return <Button size="sm" variant="secondary" loading={mitigate.isPending} onClick={() => mitigate.mutate({ id: risk.id, residualLikelihood: 2, residualImpact: 2 })}>Mitigasi</Button>;
}

export const riskColumns = [
  riskHelper.accessor('riskNumber', { header: 'No.', cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span> }),
  riskHelper.accessor('title', { header: 'Risk', cell: (info) => <span className="max-w-xs truncate text-neutral-800">{info.getValue()}</span> }),
  riskHelper.accessor('category', { header: 'Kategori', cell: (info) => <Badge variant="default">{info.getValue()}</Badge> }),
  riskHelper.accessor('likelihood', { header: 'L', cell: (info) => <span className="font-mono tabular-nums text-neutral-600">{info.getValue()}</span> }),
  riskHelper.accessor('impact', { header: 'I', cell: (info) => <span className="font-mono tabular-nums text-neutral-600">{info.getValue()}</span> }),
  riskHelper.accessor('score', { header: 'Skor', cell: (info) => <Badge variant={Number(info.getValue()) >= 12 ? 'warning' : Number(info.getValue()) >= 6 ? 'default' : 'success'}>{info.getValue()}</Badge> }),
  riskHelper.accessor('status', { header: 'Status', cell: (info) => <Badge variant={statusVariant[info.getValue() as GovernanceStatus]}>{info.getValue()}</Badge> }),
  riskHelper.display({ id: 'actions', header: '', cell: ({ row }) => <MitigateRiskCell risk={row.original} /> }),
];
