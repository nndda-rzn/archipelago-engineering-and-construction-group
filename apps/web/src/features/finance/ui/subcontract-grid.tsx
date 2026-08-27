import { Badge, Button } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useRejectSubcontractProgress, useVerifySubcontractProgress } from '../model/subcontract.api';
import type { Subcontract, SubcontractProgress } from '@aec/api-contracts';
import { formatIdr as fmt } from '@/shared/lib/format';

export const statusVariant: Record<string, 'default' | 'success' | 'warning'> = {
  DRAFT: 'default',
  ACTIVE: 'success',
  COMPLETED: 'success',
  TERMINATED: 'warning',
};

export const progressVariant: Record<string, 'default' | 'success' | 'warning'> = {
  SUBMITTED: 'default',
  VERIFIED: 'success',
  REJECTED: 'warning',
};

const columnHelper = createColumnHelper<Subcontract>();
const progColumnHelper = createColumnHelper<SubcontractProgress>();

export const subcontractColumns = [
  columnHelper.accessor('subconNumber', {
    header: 'No. Subkon',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  columnHelper.accessor('project', {
    header: 'Project',
    cell: (info) => <span className="text-neutral-700">{info.getValue()?.code}</span>,
  }),
  columnHelper.accessor('vendor', {
    header: 'Vendor',
    cell: (info) => <span className="text-neutral-800">{info.getValue()}</span>,
  }),
  columnHelper.accessor('title', {
    header: 'Judul',
    cell: (info) => <span className="text-neutral-700">{info.getValue()}</span>,
  }),
  columnHelper.accessor('contractValue', {
    header: 'Nilai Kontrak',
    cell: (info) => <span className="font-mono font-medium tabular-nums text-neutral-800">{fmt(info.getValue())}</span>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
];

export const progressColumns = [
  progColumnHelper.accessor('period', {
    header: 'Periode',
    cell: (info) => <span className="font-mono text-neutral-600">{info.getValue() ?? '-'}</span>,
  }),
  progColumnHelper.accessor('progressDate', {
    header: 'Tanggal',
    cell: (info) => <span className="font-mono text-neutral-600">{new Date(info.getValue()).toLocaleDateString('id-ID')}</span>,
  }),
  progColumnHelper.accessor('progressPercent', {
    header: 'Progress',
    cell: (info) => <span className="font-mono tabular-nums text-neutral-700">{info.getValue()}%</span>,
  }),
  progColumnHelper.accessor('verifiedAmount', {
    header: 'Nilai Bayar',
    cell: (info) => <span className="font-mono font-medium tabular-nums text-neutral-800">{fmt(info.getValue())}</span>,
  }),
  progColumnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={progressVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  progColumnHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <ProgressActions entry={row.original} />,
  }),
];

function ProgressActions({ entry }: { entry: SubcontractProgress }) {
  const verify = useVerifySubcontractProgress();
  const reject = useRejectSubcontractProgress();
  if (entry.status !== 'SUBMITTED') return null;
  return (
    <div className="flex items-center gap-1">
      <Button size="sm" variant="secondary" loading={verify.isPending} onClick={() => verify.mutate({ subcontractId: entry.subcontractId, progressId: entry.id })}>
        Verifikasi
      </Button>
      <Button size="sm" variant="ghost" onClick={() => reject.mutate({ subcontractId: entry.subcontractId, progressId: entry.id })}>
        Tolak
      </Button>
    </div>
  );
}
