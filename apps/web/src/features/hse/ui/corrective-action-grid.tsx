import { Badge, Button } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useVerifyCorrectiveAction } from '../model/hse.api';
import type { CorrectiveAction } from '@aec/api-contracts';
import { HseDateCell } from './hse-shared';

const caHelper = createColumnHelper<CorrectiveAction>();

function VerifyCaCell({ ca }: { ca: CorrectiveAction }) {
  const verify = useVerifyCorrectiveAction();
  if (ca.status === 'VERIFIED') return null;
  return <Button size="sm" variant="secondary" loading={verify.isPending} onClick={() => verify.mutate({ id: ca.id, evidence: 'done' })}>Verify</Button>;
}

export const caColumns = [
  caHelper.accessor('action', { header: 'Tindakan', cell: (info) => <span className="text-neutral-700">{info.getValue()}</span> }),
  caHelper.accessor('owner', { header: 'Owner', cell: (info) => <span className="text-neutral-600">{info.getValue()}</span> }),
  caHelper.accessor('dueDate', { header: 'Jatuh Tempo', cell: (info) => <HseDateCell value={info.getValue()} /> }),
  caHelper.accessor('status', { header: 'Status', cell: (info) => <Badge variant={info.getValue() === 'VERIFIED' ? 'success' : 'default'}>{info.getValue()}</Badge> }),
  caHelper.display({ id: 'actions', header: '', cell: ({ row }) => <VerifyCaCell ca={row.original} /> }),
];
