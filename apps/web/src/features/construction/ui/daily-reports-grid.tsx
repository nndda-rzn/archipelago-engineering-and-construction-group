import { Badge, EmptyCell } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import type { DailyReport } from '@aec/api-contracts';
import { formatDate } from '@/shared/lib/format';

const weatherLabel: Record<string, string> = { CERAH: 'Clear', BERAWAN: 'Cloudy', MENDUNG: 'Overcast', HUJAN: 'Rain' };
const columnHelper = createColumnHelper<DailyReport>();
export const dailyReportColumns = [
  columnHelper.accessor('drNumber', { header: 'Number', cell: (i) => <span className="font-mono text-neutral-600">{i.getValue()}</span> }),
  columnHelper.accessor('reportDate', { header: 'Date', cell: (i) => formatDate(i.getValue()) }),
  columnHelper.accessor('weather', { header: 'Weather', cell: (i) => i.getValue() ? weatherLabel[i.getValue() as string] ?? i.getValue() : <EmptyCell /> }),
  columnHelper.accessor('manpowerTotal', { header: 'Manpower', cell: (i) => <span className="font-mono tabular-nums">{i.getValue()}</span> }),
  columnHelper.accessor('summary', { header: 'Summary', cell: (i) => <span className="max-w-md line-clamp-1">{i.getValue()}</span> }),
  columnHelper.accessor('status', { header: 'Status', cell: (i) => <Badge variant={i.getValue() === 'SUBMITTED' ? 'success' : 'default'}>{i.getValue()}</Badge> }),
];