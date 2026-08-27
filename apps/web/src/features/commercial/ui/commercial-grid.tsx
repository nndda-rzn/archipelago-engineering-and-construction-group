import { Badge, Button } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import type { Client, Opportunity, Contract } from '@aec/api-contracts';
import { useUpdateOpportunityStage, useExecuteContract } from '../model/commercial.api';
import { formatIdr as fmt } from '@/shared/lib/format';

export const commercialStatusVariant: Record<string, 'default' | 'success' | 'warning'> = {
  ACTIVE: 'success',
  OPEN: 'success',
  DRAFT: 'default',
  EXECUTED: 'success',
  WON: 'success',
  LOST: 'warning',
  COMPLETED: 'success',
  TERMINATED: 'warning',
};

// ---- Client columns --------------------------------------------------------

const clientHelper = createColumnHelper<Client>();

export const clientColumns = [
  clientHelper.accessor('clientCode', {
    header: 'Kode',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  clientHelper.accessor('name', {
    header: 'Client',
    cell: (info) => <span className="text-neutral-800 font-medium">{info.getValue()}</span>,
  }),
  clientHelper.accessor('industry', {
    header: 'Industri',
    cell: (info) => <span className="text-neutral-600">{info.getValue() ?? '—'}</span>,
  }),
  clientHelper.accessor('contactPerson', {
    header: 'Kontak',
    cell: (info) => <span className="text-neutral-600">{info.getValue() ?? '—'}</span>,
  }),
  clientHelper.accessor('email', {
    header: 'Email',
    cell: (info) => <span className="font-mono text-neutral-500">{info.getValue() ?? '—'}</span>,
  }),
  clientHelper.accessor('status', {
    header: 'Status',
    cell: (info) => (
      <Badge variant={commercialStatusVariant[info.getValue()] ?? 'default'}>
        {info.getValue()}
      </Badge>
    ),
  }),
];

// ---- Opportunity columns ---------------------------------------------------

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
      <Button
        size="sm"
        variant="secondary"
        loading={update.isPending}
        onClick={() =>
          update.mutate({ id: opp.id, stage: nextStage, probability: Math.min(opp.probability + 15, 100) })
        }
      >
        → {nextStage}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        loading={update.isPending}
        onClick={() => update.mutate({ id: opp.id, stage: 'LOST' })}
      >
        Lost
      </Button>
    </div>
  );
}

export const oppColumns = [
  oppHelper.accessor('oppNumber', {
    header: 'No.',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  oppHelper.accessor('title', {
    header: 'Opportunity',
    cell: (info) => <span className="max-w-xs truncate text-neutral-800">{info.getValue()}</span>,
  }),
  oppHelper.accessor('client', {
    header: 'Client',
    cell: (info) => <span className="text-neutral-700">{info.getValue()?.name}</span>,
  }),
  oppHelper.accessor('stage', {
    header: 'Stage',
    cell: (info) => (
      <Badge
        variant={
          info.getValue() === 'WON' ? 'success' : info.getValue() === 'LOST' ? 'warning' : 'default'
        }
      >
        {info.getValue()}
      </Badge>
    ),
  }),
  oppHelper.accessor('probability', {
    header: 'Prob.',
    cell: (info) => (
      <span className="font-mono tabular-nums text-neutral-600">{info.getValue()}%</span>
    ),
  }),
  oppHelper.accessor('expectedValue', {
    header: 'Nilai',
    cell: (info) => (
      <span className="font-mono tabular-nums text-neutral-800 font-medium">{fmt(info.getValue())}</span>
    ),
  }),
  oppHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <OppAdvanceBtn opp={row.original} />,
  }),
];

// ---- Contract columns ------------------------------------------------------

const contractHelper = createColumnHelper<Contract>();

export function ContractExecuteBtn({ contract }: { contract: Contract }) {
  const execute = useExecuteContract();
  if (contract.status !== 'DRAFT') return null;
  return (
    <Button
      size="sm"
      variant="secondary"
      loading={execute.isPending}
      onClick={() => execute.mutate({ id: contract.id })}
    >
      Eksekusi
    </Button>
  );
}

export const contractColumns = [
  contractHelper.accessor('contractNumber', {
    header: 'No. Kontrak',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  contractHelper.accessor('title', {
    header: 'Judul',
    cell: (info) => <span className="max-w-xs truncate text-neutral-800">{info.getValue()}</span>,
  }),
  contractHelper.accessor('client', {
    header: 'Client',
    cell: (info) => <span className="text-neutral-700">{info.getValue()?.name}</span>,
  }),
  contractHelper.accessor('contractType', {
    header: 'Tipe',
    cell: (info) => <Badge variant="default">{info.getValue()}</Badge>,
  }),
  contractHelper.accessor('value', {
    header: 'Nilai',
    cell: (info) => (
      <span className="font-mono tabular-nums text-neutral-800 font-medium">{fmt(info.getValue())}</span>
    ),
  }),
  contractHelper.accessor('retentionTerm', {
    header: 'Retensi',
    cell: (info) => (
      <span className="font-mono tabular-nums text-neutral-600">{info.getValue()}%</span>
    ),
  }),
  contractHelper.accessor('status', {
    header: 'Status',
    cell: (info) => (
      <Badge variant={commercialStatusVariant[info.getValue()] ?? 'default'}>
        {info.getValue()}
      </Badge>
    ),
  }),
  contractHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <ContractExecuteBtn contract={row.original} />,
  }),
];
