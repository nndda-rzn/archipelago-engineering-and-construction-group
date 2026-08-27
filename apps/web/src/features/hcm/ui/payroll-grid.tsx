import { Badge } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import type { PayrollAllocation } from '@aec/api-contracts';
import { formatIdr as fmt } from '@/shared/lib/format';

const columnHelper = createColumnHelper<PayrollAllocation>();

export const payrollColumns = [
  columnHelper.accessor('period', { header: 'Periode', cell: (i) => <span className="font-mono text-neutral-600">{i.getValue()}</span> }),
  columnHelper.accessor('employee', { header: 'Karyawan', cell: (i) => <span className="text-neutral-800 font-medium">{i.getValue()?.name}</span> }),
  columnHelper.accessor('project', { header: 'Project', cell: (i) => i.getValue() ? <span className="text-neutral-700">{i.getValue()!.code}</span> : <span className="text-neutral-400">- (overhead)</span> }),
  columnHelper.accessor('grossAmount', { header: 'Gross', cell: (i) => <span className="font-mono font-medium tabular-nums text-neutral-800">{fmt(i.getValue())}</span> }),
  columnHelper.accessor('projectAmount', { header: 'ke Project', cell: (i) => <span className="font-mono tabular-nums text-emerald-700">{fmt(i.getValue())}</span> }),
  columnHelper.accessor('overheadAmount', { header: 'Overhead', cell: (i) => <span className="font-mono tabular-nums text-amber-700">{fmt(i.getValue())}</span> }),
  columnHelper.accessor('status', { header: 'Status', cell: (i) => <Badge variant={i.getValue() === 'POSTED' ? 'success' : 'default'}>{i.getValue()}</Badge> }),
];
