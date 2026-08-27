import { Badge } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import type { DailyReport } from '@aec/api-contracts';

const weatherLabel: Record<string, string> = { CERAH: 'Cerah', BERAWAN: 'Berawan', MENDUNG: 'Mendung', HUJAN: 'Hujan' };
const columnHelper = createColumnHelper<DailyReport>();
export const dailyReportColumns = [
  columnHelper.accessor('drNumber', { header: 'Nomor', cell: (i) => <span className="font-mono text-neutral-600">{i.getValue()}</span> }),
  columnHelper.accessor('reportDate', { header: 'Tanggal', cell: (i) => new Date(i.getValue()).toLocaleDateString('id-ID') }),
  columnHelper.accessor('weather', { header: 'Cuaca', cell: (i) => i.getValue() ? weatherLabel[i.getValue() as string] ?? i.getValue() : '-' }),
  columnHelper.accessor('manpowerTotal', { header: 'Manpower', cell: (i) => <span className="font-mono tabular-nums">{i.getValue()}</span> }),
  columnHelper.accessor('summary', { header: 'Ringkasan', cell: (i) => <span className="max-w-md line-clamp-1">{i.getValue()}</span> }),
  columnHelper.accessor('status', { header: 'Status', cell: (i) => <Badge variant={i.getValue() === 'SUBMITTED' ? 'success' : 'default'}>{i.getValue()}</Badge> }),
];