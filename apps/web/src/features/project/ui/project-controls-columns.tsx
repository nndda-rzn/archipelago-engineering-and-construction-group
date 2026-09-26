import { createColumnHelper } from '@tanstack/react-table';
import { Badge, EmptyCell } from '@aec/ui';
import type { ControlAccount, CostCode, Forecast } from '@aec/api-contracts';
import { formatIdr as fmt } from '@/shared/lib/format';

const costCodeHelper = createColumnHelper<CostCode>();
const caHelper = createColumnHelper<ControlAccount>();
const forecastHelper = createColumnHelper<Forecast>();

export const costCodeColumns = [
  costCodeHelper.accessor('code', { header: 'Kode', cell: (i) => <span className="font-mono text-neutral-800">{i.getValue()}</span> }),
  costCodeHelper.accessor('name', { header: 'Nama', cell: (i) => <span className="text-neutral-800">{i.getValue()}</span> }),
  costCodeHelper.accessor('wbsItem', { header: 'WBS', cell: (i) => <span className="font-mono text-neutral-600">{i.getValue()?.code ?? <EmptyCell />}</span> }),
  costCodeHelper.accessor('costType', { header: 'Tipe', cell: (i) => <Badge variant="default">{i.getValue()}</Badge> }),
  costCodeHelper.accessor('status', { header: 'Status', cell: (i) => <Badge variant={i.getValue() === 'ACTIVE' ? 'success' : 'warning'}>{i.getValue()}</Badge> }),
];

export const caColumns = [
  caHelper.accessor('code', { header: 'Kode', cell: (i) => <span className="font-mono text-neutral-800">{i.getValue()}</span> }),
  caHelper.accessor('name', { header: 'Nama', cell: (i) => <span className="text-neutral-800">{i.getValue()}</span> }),
  caHelper.accessor('wbsItem', { header: 'WBS', cell: (i) => <span className="font-mono text-neutral-600">{i.getValue()?.code}</span> }),
  caHelper.accessor('responsibleManager', { header: 'Responsible', cell: (i) => <span className="text-neutral-700">{i.getValue()}</span> }),
  caHelper.accessor('budgetAmount', { header: 'Budget', cell: (i) => <span className="font-mono tabular-nums text-neutral-800">{fmt(i.getValue())}</span> }),
  caHelper.accessor('plannedValue', { header: 'PV', cell: (i) => <span className="font-mono tabular-nums text-neutral-700">{fmt(i.getValue())}</span> }),
];

export const forecastColumns = [
  forecastHelper.accessor('version', { header: 'Versi', cell: (i) => <span className="font-mono text-neutral-800">v{i.getValue()}</span> }),
  forecastHelper.accessor('period', { header: 'Periode', cell: (i) => <span className="font-mono text-neutral-600">{i.getValue() ?? <EmptyCell />}</span> }),
  forecastHelper.accessor('estimateAtCompletion', { header: 'EAC', cell: (i) => <span className="font-mono tabular-nums text-neutral-800">{fmt(i.getValue())}</span> }),
  forecastHelper.accessor('estimateToComplete', { header: 'ETC', cell: (i) => <span className="font-mono tabular-nums text-neutral-700">{fmt(i.getValue())}</span> }),
  forecastHelper.accessor('varianceAtCompletion', { header: 'VAC', cell: (i) => <span className={`font-mono tabular-nums ${i.getValue() >= 0 ? 'text-financial-positive-500' : 'text-destructive-600'}`}>{fmt(i.getValue())}</span> }),
  forecastHelper.accessor('status', { header: 'Status', cell: (i) => <Badge variant="default">{i.getValue()}</Badge> }),
];
