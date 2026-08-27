import { Badge, Button } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useResolveObservation } from '../model/hse.api';
import type { SafetyObservation } from '@aec/api-contracts';

const obsHelper = createColumnHelper<SafetyObservation>();

function ResolveObservationCell({ observation }: { observation: SafetyObservation }) {
  const resolve = useResolveObservation();
  if (observation.status !== 'OPEN') return null;
  return <Button size="sm" variant="secondary" loading={resolve.isPending} onClick={() => resolve.mutate({ id: observation.id })}>Resolve</Button>;
}

export const observationColumns = [
  obsHelper.accessor('observationNumber', { header: 'No.', cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span> }),
  obsHelper.accessor('type', { header: 'Tipe', cell: (info) => <Badge variant={info.getValue() === 'UNSAFE' ? 'warning' : 'success'}>{info.getValue()}</Badge> }),
  obsHelper.accessor('description', { header: 'Deskripsi', cell: (info) => <span className="text-neutral-700">{info.getValue()}</span> }),
  obsHelper.accessor('status', { header: 'Status', cell: (info) => <Badge variant={info.getValue() === 'OPEN' ? 'warning' : 'success'}>{info.getValue()}</Badge> }),
  obsHelper.display({ id: 'actions', header: '', cell: ({ row }) => <ResolveObservationCell observation={row.original} /> }),
];
