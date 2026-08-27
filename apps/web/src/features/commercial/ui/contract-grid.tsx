import { Badge, Button } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useExecuteContract } from '../model/commercial.api';
import type { Contract } from '@aec/api-contracts';
import { formatIdr as fmt } from '@/shared/lib/format';
import { commercialStatusVariant } from './commercial-status';

const contractHelper = createColumnHelper<Contract>();

export function ContractExecuteBtn({ contract }: { contract: Contract }) {
  const execute = useExecuteContract();
  if (contract.status !== 'DRAFT') return null;
  return (
    <Button size="sm" variant="secondary" loading={execute.isPending} onClick={() => execute.mutate({ id: contract.id })}>
      Eksekusi
    </Button>
  );
}

export const contractColumns = [
  contractHelper.accessor('contractNumber', { header: 'No. Kontrak', cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span> }),
  contractHelper.accessor('title', { header: 'Judul', cell: (info) => <span className="max-w-xs truncate text-neutral-800">{info.getValue()}</span> }),
  contractHelper.accessor('client', { header: 'Client', cell: (info) => <span className="text-neutral-700">{info.getValue()?.name}</span> }),
  contractHelper.accessor('contractType', { header: 'Tipe', cell: (info) => <Badge variant="default">{info.getValue()}</Badge> }),
  contractHelper.accessor('value', { header: 'Nilai', cell: (info) => <span className="font-mono tabular-nums text-neutral-800 font-medium">{fmt(info.getValue())}</span> }),
  contractHelper.accessor('retentionTerm', { header: 'Retensi', cell: (info) => <span className="font-mono tabular-nums text-neutral-600">{info.getValue()}%</span> }),
  contractHelper.accessor('status', { header: 'Status', cell: (info) => <Badge variant={commercialStatusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge> }),
  contractHelper.display({ id: 'actions', header: '', cell: ({ row }) => <ContractExecuteBtn contract={row.original} /> }),
];
