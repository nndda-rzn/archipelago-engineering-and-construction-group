import { Badge, Button } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useClosePunchItem } from '../model/quality.api';
import type { PunchListItem } from '@aec/api-contracts';

const punchHelper = createColumnHelper<PunchListItem>();

function ClosePunchCell({ punch }: { punch: PunchListItem }) {
  const close = useClosePunchItem();
  if (punch.status === 'CLOSED') return null;
  return <Button size="sm" variant="secondary" loading={close.isPending} onClick={() => close.mutate({ id: punch.id })}>Tutup</Button>;
}

export const punchColumns = [
  punchHelper.accessor('punchNumber', { header: 'No.', cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span> }),
  punchHelper.accessor('description', { header: 'Deskripsi', cell: (info) => <span className="max-w-sm truncate text-neutral-700">{info.getValue()}</span> }),
  punchHelper.accessor('status', { header: 'Status', cell: (info) => <Badge variant={info.getValue() === 'CLOSED' ? 'success' : 'warning'}>{info.getValue()}</Badge> }),
  punchHelper.display({ id: 'actions', header: '', cell: ({ row }) => <ClosePunchCell punch={row.original} /> }),
];
