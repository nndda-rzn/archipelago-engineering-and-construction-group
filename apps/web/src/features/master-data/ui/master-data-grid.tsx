import { Badge, Button, StatusBadge } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useUpdateFiscalPeriodStatus } from '../model/master-data.api';
import type { FiscalPeriod, Vendor } from '@aec/api-contracts';
import { formatDate } from '@/shared/lib/format';

const vendorHelper = createColumnHelper<Vendor>();
const periodHelper = createColumnHelper<FiscalPeriod>();

export const vendorColumns = [
  vendorHelper.accessor('vendorCode', {
    header: 'Kode',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  vendorHelper.accessor('name', {
    header: 'Vendor',
    cell: (info) => <span className="text-neutral-800 font-medium">{info.getValue()}</span>,
  }),
  vendorHelper.accessor('taxId', {
    header: 'NPWP',
    cell: (info) => <span className="font-mono text-neutral-600">{info.getValue() ?? '-'}</span>,
  }),
  vendorHelper.accessor('category', {
    header: 'Kategori',
    cell: (info) => <Badge variant="default">{info.getValue()}</Badge>,
  }),
  vendorHelper.accessor('contactPerson', {
    header: 'Kontak',
    cell: (info) => <span className="text-neutral-600">{info.getValue() ?? '-'}</span>,
  }),
  vendorHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
];

export const periodColumns = [
  periodHelper.accessor('periodCode', {
    header: 'Periode',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  periodHelper.accessor('startDate', {
    header: 'Mulai',
    cell: (info) => <span className="font-mono text-neutral-600">{formatDate(info.getValue())}</span>,
  }),
  periodHelper.accessor('endDate', {
    header: 'Selesai',
    cell: (info) => <span className="font-mono text-neutral-600">{formatDate(info.getValue())}</span>,
  }),
  periodHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  periodHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <PeriodStatusButton period={row.original} />,
  }),
];

function PeriodStatusButton({ period }: { period: FiscalPeriod }) {
  const update = useUpdateFiscalPeriodStatus();
  const next: Record<string, string> = { FUTURE: 'OPEN', OPEN: 'SOFT_CLOSED', SOFT_CLOSED: 'CLOSED', CLOSED: 'LOCKED' };
  const label: Record<string, string> = { OPEN: 'Buka', SOFT_CLOSED: 'Tutup Sementara', CLOSED: 'Tutup', LOCKED: 'Kunci' };
  const to = next[period.status];
  if (!to) return null;
  return (
    <Button size="sm" variant="secondary" loading={update.isPending} onClick={() => update.mutate({ id: period.id, status: to })}>
      {label[to] ?? to}
    </Button>
  );
}
