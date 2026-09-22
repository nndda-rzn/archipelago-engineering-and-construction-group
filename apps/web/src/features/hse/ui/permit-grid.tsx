import { Badge, ConfirmActionButton } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useRevokePermit } from '../model/hse.api';
import type { PermitToWork } from '@aec/api-contracts';
import { HseDateCell } from './hse-shared';

const permitHelper = createColumnHelper<PermitToWork>();

function RevokePermitCell({ permit }: { permit: PermitToWork }) {
  const revoke = useRevokePermit();
  if (permit.status !== 'ACTIVE') return null;
  return <ConfirmActionButton size="sm" variant="ghost" loading={revoke.isPending} confirmTitle="Cabut izin kerja?" confirmDescription="Permit to Work akan dicabut dan tidak berlaku lagi." confirmLabel="Cabut" onConfirm={() => revoke.mutate({ id: permit.id })}>Cabut</ConfirmActionButton>;
}

export const permitColumns = [
  permitHelper.accessor('permitNumber', { header: 'No. PTW', cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span> }),
  permitHelper.accessor('area', { header: 'Area', cell: (info) => <span className="text-neutral-700">{info.getValue()}</span> }),
  permitHelper.accessor('validFrom', { header: 'Berlaku Dari', cell: (info) => <HseDateCell value={info.getValue()} /> }),
  permitHelper.accessor('validTo', { header: 'Sampai', cell: (info) => <HseDateCell value={info.getValue()} /> }),
  permitHelper.accessor('issuedTo', { header: 'Diterbitkan ke', cell: (info) => <span className="text-neutral-600">{info.getValue()}</span> }),
  permitHelper.accessor('status', { header: 'Status', cell: (info) => <Badge variant={info.getValue() === 'ACTIVE' ? 'success' : 'warning'}>{info.getValue()}</Badge> }),
  permitHelper.display({ id: 'actions', header: '', cell: ({ row }) => <RevokePermitCell permit={row.original} /> }),
];
