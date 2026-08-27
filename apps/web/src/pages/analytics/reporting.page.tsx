import { createColumnHelper } from '@tanstack/react-table';
import { Badge, DataGrid } from '@aec/ui';
import { useCashFlow, useAging, useProjectCostSummary, type AgingBucket, type ProjectCostSummaryItem } from '@/features/analytics';
import { CashFlowChart } from '@/widgets/dashboard-charts';
import { formatIdr as fmt } from '@/shared/lib/format';

const bucketHelper = createColumnHelper<AgingBucket>();
const pcsHelper = createColumnHelper<ProjectCostSummaryItem>();

function bucketColumns(label: string) {
  return [
    bucketHelper.accessor('bucket', {
      header: 'Umur',
      cell: (info) => <Badge variant="default">{info.getValue()}</Badge>,
    }),
    bucketHelper.accessor('amount', {
      header: label,
      cell: (info) => <span className="font-mono tabular-nums text-neutral-800">{fmt(info.getValue())}</span>,
    }),
  ];
}

const pcsColumns = [
  pcsHelper.accessor('projectCode', {
    header: 'Project',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  pcsHelper.accessor('contractValue', {
    header: 'Kontrak',
    cell: (info) => <span className="font-mono tabular-nums text-neutral-700">{fmt(info.getValue())}</span>,
  }),
  pcsHelper.accessor('budget', {
    header: 'Budget',
    cell: (info) => <span className="font-mono tabular-nums text-neutral-700">{fmt(info.getValue())}</span>,
  }),
  pcsHelper.accessor('cost', {
    header: 'Cost',
    cell: (info) => <span className="font-mono tabular-nums text-destructive-600">{fmt(info.getValue())}</span>,
  }),
  pcsHelper.accessor('revenue', {
    header: 'Revenue',
    cell: (info) => <span className="font-mono tabular-nums text-emerald-700">{fmt(info.getValue())}</span>,
  }),
  pcsHelper.accessor('margin', {
    header: 'Margin',
    cell: (info) => (
      <span className={`font-mono tabular-nums font-medium ${info.getValue() >= 0 ? 'text-emerald-700' : 'text-destructive-600'}`}>
        {fmt(info.getValue())}
      </span>
    ),
  }),
  pcsHelper.accessor('budgetUsagePct', {
    header: 'Budget Usage',
    cell: (info) => <span className="font-mono tabular-nums text-neutral-600">{info.getValue()}%</span>,
  }),
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <h2 className="mb-3 text-h2 text-neutral-950">{title}</h2>
      {children}
    </div>
  );
}

export function ReportingPage() {
  const cashFlow = useCashFlow();
  const aging = useAging();
  const costSummary = useProjectCostSummary();

  const total = (rows: AgingBucket[]) => rows.reduce((s, r) => s + r.amount, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-h1 text-neutral-950">Advanced Reporting</h1>
        <p className="mt-1 text-body-sm text-neutral-500">Cash flow, aging AP/AR, project cost summary (Fase 10)</p>
      </div>

      <div className="space-y-6">
        <Section title="Cash Flow">
          {cashFlow.isLoading ? (
            <p className="text-body text-neutral-500">Memuat…</p>
          ) : cashFlow.data ? (
            <>
              <CashFlowChart data={cashFlow.data.series} />
              <div className="mt-3 flex gap-6 text-body-sm text-neutral-600">
                <span>Total In: <span className="font-mono text-emerald-700">{fmt(cashFlow.data.totalCashIn)}</span></span>
                <span>Total Out: <span className="font-mono text-destructive-600">{fmt(cashFlow.data.totalCashOut)}</span></span>
                <span>Net: <span className={`font-mono font-medium ${cashFlow.data.netCash >= 0 ? 'text-emerald-700' : 'text-destructive-600'}`}>{fmt(cashFlow.data.netCash)}</span></span>
              </div>
            </>
          ) : null}
        </Section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Section title={`Aging AR (Total ${fmt(total(aging.data?.ar ?? []))})`}>
            <DataGrid columns={bucketColumns('Piutang')} data={aging.data?.ar ?? []} isLoading={aging.isLoading} emptyMessage="Tidak ada piutang" />
          </Section>
          <Section title={`Aging AP (Total ${fmt(total(aging.data?.ap ?? []))})`}>
            <DataGrid columns={bucketColumns('Hutang')} data={aging.data?.ap ?? []} isLoading={aging.isLoading} emptyMessage="Tidak ada hutang" />
          </Section>
        </div>

        <Section title="Project Cost Summary">
          <DataGrid columns={pcsColumns} data={costSummary.data?.items ?? []} isLoading={costSummary.isLoading} emptyMessage="Belum ada project" />
        </Section>
      </div>
    </div>
  );
}
