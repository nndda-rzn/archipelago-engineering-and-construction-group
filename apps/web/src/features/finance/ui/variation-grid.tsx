import { Badge, Button, StatusBadge } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useApproveVariation, useRejectVariation } from '../model/variation.api';
import type { Variation } from '@aec/api-contracts';
import { formatIdr as fmt } from '@/shared/lib/format';

const columnHelper = createColumnHelper<Variation>();

export const variationColumns = [
  columnHelper.accessor('variationNumber', {
    header: 'No. Variation',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  columnHelper.accessor('project', {
    header: 'Project',
    cell: (info) => <span className="text-neutral-700">{info.getValue()?.code}</span>,
  }),
  columnHelper.accessor('title', {
    header: 'Judul',
    cell: (info) => <span className="text-neutral-800">{info.getValue()}</span>,
  }),
  columnHelper.accessor('type', {
    header: 'Tipe',
    cell: (info) => {
      const type = info.getValue();
      return <Badge variant={type === 'ADDITIVE' ? 'success' : 'warning'}>{type}</Badge>;
    },
  }),
  columnHelper.accessor('amountChange', {
    header: 'Perubahan Nilai',
    cell: (info) => {
      const value = Number(info.getValue());
      const isAdditive = info.row.original.type === 'ADDITIVE';
      return <span className={`font-mono tabular-nums ${isAdditive ? 'text-success-700' : 'text-destructive-600'}`}>{isAdditive ? '+' : '-'}{fmt(value)}</span>;
    },
  }),
  columnHelper.accessor('scheduleImpactDays', {
    header: 'Dampak Jadwal',
    cell: (info) => {
      const value = info.getValue();
      return value != null ? <span className="font-mono tabular-nums text-neutral-700">{value > 0 ? `+${value} hari` : `${value} hari`}</span> : '—';
    },
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <ActionButtons variation={row.original} />,
  }),
];

function ActionButtons({ variation }: { variation: Variation }) {
  const approve = useApproveVariation();
  const reject = useRejectVariation();
  if (variation.status !== 'POTENTIAL') return null;
  return (
    <div className="flex items-center gap-1">
      <Button size="sm" variant="secondary" loading={approve.isPending} onClick={() => approve.mutate({ id: variation.id })}>
        Setujui
      </Button>
      <Button size="sm" variant="ghost" onClick={() => reject.mutate({ id: variation.id })}>
        Tolak
      </Button>
    </div>
  );
}
