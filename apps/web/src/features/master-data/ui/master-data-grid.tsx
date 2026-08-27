import { Badge, Button } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useUpdateFiscalPeriodStatus } from '../model/master-data.api';
import type { FiscalPeriod, Vendor } from '@aec/api-contracts';

export const statusVariant: Record<string, 'default' | 'success' | 'warning'> = {
  ACTIVE: 'success',
  OPEN: 'success',
  CLOSED: 'warning',
  LOCKED: 'warning',
  SOFT_CLOSED: 'default',
  FUTURE: 'default',
  INACTIVE: 'warning',
};

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
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
];

export const periodColumns = [
  periodHelper.accessor('periodCode', {
    header: 'Periode',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  periodHelper.accessor('startDate', {
    header: 'Mulai',
    cell: (info) => <span className="font-mono text-neutral-600">{new Date(info.getValue()).toLocaleDateString('id-ID')}</span>,
  }),
  periodHelper.accessor('endDate', {
    header: 'Selesai',
    cell: (info) => <span className="font-mono text-neutral-600">{new Date(info.getValue()).toLocaleDateString('id-ID')}</span>,
  }),
  periodHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
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
  const to = next[period.status];
  if (!to) return null;
  return (
    <Button size="sm" variant="secondary" loading={update.isPending} onClick={() => update.mutate({ id: period.id, status: to })}>
      {to}
    </Button>
  );
}
