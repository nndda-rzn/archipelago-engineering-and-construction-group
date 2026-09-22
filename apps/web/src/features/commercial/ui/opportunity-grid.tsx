import { Badge, Button, ConfirmActionButton } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useUpdateOpportunityStage } from '../model/commercial.api';
import type { Opportunity } from '@aec/api-contracts';
import { formatIdr as fmt } from '@/shared/lib/format';

const oppHelper = createColumnHelper<Opportunity>();

export function OppAdvanceBtn({ opp }: { opp: Opportunity }) {
  const update = useUpdateOpportunityStage();
  if (opp.stage === 'WON' || opp.stage === 'LOST') return null;
  const nextStage =
    opp.stage === 'LEAD'
      ? 'QUALIFIED'
      : opp.stage === 'QUALIFIED'
        ? 'PROPOSAL'
        : opp.stage === 'PROPOSAL'
          ? 'NEGOTIATION'
          : 'WON';
  return (
    <div className="flex items-center gap-1">
      <Button size="sm" variant="secondary" loading={update.isPending} onClick={() => update.mutate({ id: opp.id, stage: nextStage, probability: Math.min(opp.probability + 15, 100) })}>
        → {nextStage}
      </Button>
      <ConfirmActionButton size="sm" variant="ghost" loading={update.isPending} confirmTitle="Tandai Lost?" confirmDescription="Opportunity akan ditandai sebagai Lost." confirmLabel="Lost" onConfirm={() => update.mutate({ id: opp.id, stage: 'LOST' })}>
        Lost
      </ConfirmActionButton>
    </div>
  );
}

export const oppColumns = [
  oppHelper.accessor('oppNumber', { header: 'No.', cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span> }),
  oppHelper.accessor('title', { header: 'Opportunity', cell: (info) => <span className="max-w-xs truncate text-neutral-800">{info.getValue()}</span> }),
  oppHelper.accessor('client', { header: 'Client', cell: (info) => <span className="text-neutral-700">{info.getValue()?.name}</span> }),
  oppHelper.accessor('stage', { header: 'Stage', cell: (info) => <Badge variant={info.getValue() === 'WON' ? 'success' : info.getValue() === 'LOST' ? 'warning' : 'default'}>{info.getValue()}</Badge> }),
  oppHelper.accessor('probability', { header: 'Prob.', cell: (info) => <span className="font-mono tabular-nums text-neutral-600">{info.getValue()}%</span> }),
  oppHelper.accessor('expectedValue', { header: 'Nilai', cell: (info) => <span className="font-mono tabular-nums text-neutral-800 font-medium">{fmt(info.getValue())}</span> }),
  oppHelper.display({ id: 'actions', header: '', cell: ({ row }) => <OppAdvanceBtn opp={row.original} /> }),
];
