import { Badge, Button } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { usePublishDrawing } from '../model/engineering.api';
import type { Drawing } from '@aec/api-contracts';
import { engStatusVariant } from './engineering-shared';

const drwHelper = createColumnHelper<Drawing>();

export function DrwPublishBtn({ row }: { row: Drawing }) {
  const publish = usePublishDrawing();
  if (row.status === 'PUBLISHED') return null;
  return (
    <Button size="sm" variant="secondary" loading={publish.isPending} onClick={() => publish.mutate({ id: row.id })}>
      Publish
    </Button>
  );
}

export const drwColumns = [
  drwHelper.accessor('drawingNumber', { header: 'No.', cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span> }),
  drwHelper.accessor('title', { header: 'Drawing', cell: (info) => <span className="max-w-xs truncate text-neutral-800">{info.getValue()}</span> }),
  drwHelper.accessor('discipline', { header: 'Disiplin', cell: (info) => <Badge variant="default">{info.getValue()}</Badge> }),
  drwHelper.accessor('currentRevision', { header: 'Rev.', cell: (info) => <span className="font-mono text-neutral-600">{info.getValue()}</span> }),
  drwHelper.accessor('status', { header: 'Status', cell: (info) => <Badge variant={engStatusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge> }),
  drwHelper.display({ id: 'actions', header: '', cell: ({ row }) => <DrwPublishBtn row={row.original} /> }),
];
