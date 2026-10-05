import { Button, StatusBadge } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useInspect } from '../model/quality.api';
import type { InspectionRequest } from '@aec/api-contracts';

const insHelper = createColumnHelper<InspectionRequest>();

function InspectButtons({ inspection }: { inspection: InspectionRequest }) {
  const inspect = useInspect();
  if (inspection.status === 'CLOSED') return null;
  return (
    <div className="flex items-center gap-1">
      <Button size="sm" variant="secondary" loading={inspect.isPending} onClick={() => inspect.mutate({ id: inspection.id, result: 'PASS' })}>
        PASS
      </Button>
      <Button size="sm" variant="ghost" loading={inspect.isPending} onClick={() => inspect.mutate({ id: inspection.id, result: 'FAIL' })}>
        FAIL
      </Button>
    </div>
  );
}

export const insColumns = [
  insHelper.accessor('inspectionNumber', { header: 'Inspection No.', cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span> }),
  insHelper.accessor('description', { header: 'Description', cell: (info) => <span className="max-w-sm truncate text-neutral-700">{info.getValue()}</span> }),
  insHelper.accessor('result', { header: 'Hasil', cell: ({ row }) => <StatusBadge status={row.original.result} /> }),
  insHelper.accessor('status', { header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> }),
  insHelper.display({ id: 'actions', header: '', cell: ({ row }) => <InspectButtons inspection={row.original} /> }),
];
