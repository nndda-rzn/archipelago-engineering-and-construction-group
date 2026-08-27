import { Badge } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import type { DailyReport } from '@aec/api-contracts';

const weatherLabel: Record<string, string> = {
  CERAH: 'Cerah',
  BERAWAN: 'Berawan',
  MENDUNG: 'Mendung',
  HUJAN: 'Hujan',
};

const columnHelper = createColumnHelper<DailyReport>();

export const dailyReportColumns = [
  columnHelper.accessor('drNumber', { header: 'Nomor', cell: (info) => <span className="font-mono text-neutral-600">{info.getValue()}</span> }),
  columnHelper.accessor('reportDate', {
    header: 'Tanggal',
    cell: (info) => new Date(info.getValue()).toLocaleDateString('id-ID'),
  }),
  columnHelper.accessor('weather', {
    header: 'Cuaca',
    cell: (info) => (info.getValue() ? weatherLabel[info.getValue() as string] ?? info.getValue() : '—'),
  }),
  columnHelper.accessor('manpowerTotal', {
    header: 'Manpower',
    cell: (info) => <span className="font-mono tabular-nums">{info.getValue()}</span>,
  }),
  columnHelper.accessor('summary', {
    header: 'Ringkasan',
    cell: (info) => <span className="line-clamp-1 max-w-md">{info.getValue()}</span>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={info.getValue() === 'SUBMITTED' ? 'success' : 'default'}>{info.getValue()}</Badge>,
  }),
];
