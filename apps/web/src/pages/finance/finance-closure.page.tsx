import { useState } from 'react';
import { DataGrid } from '@aec/ui';
import {
  useBalanceSheet, useConsolidation, useIncomeStatement,
  useIntercompany, useIntercompanyReconciliation, usePeriodCloses,
  type BalanceSheet, type Consolidation, type IncomeStatement,
} from '@/features/finance';
import type { IntercompanyReconciliation } from '@aec/api-contracts';
import {
  EntitySelector, IntercompanyForm, PeriodCloseForm, StatementTable,
  icColumns, pcColumns,
} from '@/features/finance/ui';
import { formatIdr as fmt } from '@/shared/lib/format';

const PAGE_SIZE = 20;

export function FinanceClosurePage() {
  const [icPage, setIcPage] = useState(1);
  const [entityId, setEntityId] = useState('');

  const intercompany = useIntercompany({ page: icPage, pageSize: PAGE_SIZE });
  const reconciliation = useIntercompanyReconciliation();
  const periodCloses = usePeriodCloses();
  const incomeStatement = useIncomeStatement({ legalEntityId: entityId });
  const balanceSheet = useBalanceSheet({ legalEntityId: entityId });
  const consolidation = useConsolidation();

  const gridProps = { rowCount: 0, isLoading: false, isError: false };

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-h3 font-semibold text-neutral-900">Finance Closure</h1>

      {/* Intercompany */}
      <section>
        <h2 className="mb-3 text-h5 font-medium text-neutral-800">Intercompany</h2>
        <IntercompanyForm />
        <DataGrid
          columns={icColumns}
          data={intercompany.data?.items ?? []}
          rowCount={intercompany.data?.total ?? 0}
          isLoading={intercompany.isLoading}
          isError={intercompany.isError}
          onRetry={() => intercompany.refetch()}
          emptyMessage="Belum ada transaksi intercompany"
        />
        {(intercompany.data?.total ?? 0) > PAGE_SIZE && (
          <div className="mt-2 flex gap-2">
            <button
              className="rounded border border-neutral-200 px-3 py-1 text-body-sm disabled:opacity-40"
              disabled={icPage <= 1}
              onClick={() => setIcPage((p) => p - 1)}
            >
              Prev
            </button>
            <button
              className="rounded border border-neutral-200 px-3 py-1 text-body-sm disabled:opacity-40"
              disabled={icPage * PAGE_SIZE >= (intercompany.data?.total ?? 0)}
              onClick={() => setIcPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </section>

      {/* Reconciliation */}
      <section>
        <h2 className="mb-3 text-h5 font-medium text-neutral-800">Rekonsiliasi Intercompany</h2>
        {reconciliation.data && <ReconciliationSummary data={reconciliation.data} />}
      </section>

      {/* Period Close */}
      <section>
        <h2 className="mb-3 text-h5 font-medium text-neutral-800">Period Close</h2>
        <PeriodCloseForm />
        <DataGrid
          columns={pcColumns}
          data={periodCloses.data?.items ?? []}
          rowCount={periodCloses.data?.items.length ?? 0}
          isLoading={periodCloses.isLoading}
          isError={false}
          emptyMessage="Belum ada period close"
        />
      </section>

      {/* Financial Statements */}
      <section>
        <h2 className="mb-3 text-h5 font-medium text-neutral-800">Laporan Keuangan</h2>
        <EntitySelector entityId={entityId} setEntityId={setEntityId} />
        {entityId && incomeStatement.data && (
          <IncomeStatementSection data={incomeStatement.data} />
        )}
        {entityId && balanceSheet.data && (
          <BalanceSheetSection data={balanceSheet.data} />
        )}
      </section>

      {/* Consolidation */}
      {consolidation.data && (
        <section>
          <h2 className="mb-3 text-h5 font-medium text-neutral-800">Konsolidasi</h2>
          <ConsolidationSection data={consolidation.data} />
        </section>
      )}
    </div>
  );
}

function ReconciliationSummary({ data }: { data: IntercompanyReconciliation }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4">
      <dl className="mb-3 flex gap-8 text-body">
        <div>
          <dt className="text-caption text-neutral-500">Total Transaksi</dt>
          <dd className="font-mono tabular-nums text-neutral-800">{data.total}</dd>
        </div>
      </dl>
      <table className="w-full text-left text-body">
        <thead>
          <tr className="border-b border-neutral-200">
            <th className="px-2 py-1.5 text-caption font-medium text-neutral-500">Dari</th>
            <th className="px-2 py-1.5 text-caption font-medium text-neutral-500">Ke</th>
            <th className="px-2 py-1.5 text-right text-caption font-medium text-neutral-500">Jumlah</th>
            <th className="px-2 py-1.5 text-right text-caption font-medium text-neutral-500">Resiprokal</th>
            <th className="px-2 py-1.5 text-caption font-medium text-neutral-500">Rekonsil</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item: { fromCode: string; toCode: string; count: number; amount: number; reciprocalAmount: number; reconciled: boolean }, idx: number) => (
            <tr key={idx} className="border-t border-neutral-100">
              <td className="px-2 py-1.5 font-mono text-neutral-700">{item.fromCode}</td>
              <td className="px-2 py-1.5 font-mono text-neutral-700">{item.toCode}</td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums text-neutral-800">{fmt(item.amount)}</td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums text-neutral-800">{fmt(item.reciprocalAmount)}</td>
              <td className="px-2 py-1.5">
                <span className={item.reconciled ? 'text-semantic-success' : 'text-destructive-600'}>
                  {item.reconciled ? 'Ya' : 'Tidak'}
                </span>
              </td>
            </tr>
          ))}
          {data.items.length === 0 && (
            <tr><td colSpan={5} className="px-2 py-2 text-caption text-neutral-500">Tidak ada data rekonsiliasi.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function IncomeStatementSection({ data }: { data: IncomeStatement }) {
  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4">
      <h3 className="mb-3 text-body font-medium text-neutral-800">Laporan Laba Rugi</h3>
      <StatementTable title="Pendapatan" rows={data.revenue} amountKey="amount" />
      <StatementTable title="Beban" rows={data.expenses} amountKey="amount" />
      <div className="mt-2 flex gap-8 border-t border-neutral-200 pt-2 text-body-sm">
        <span>Total Pendapatan: <span className="font-mono tabular-nums">{fmt(data.totalRevenue)}</span></span>
        <span>Total Beban: <span className="font-mono tabular-nums">{fmt(data.totalExpense)}</span></span>
        <span className={data.netIncome >= 0 ? 'text-semantic-success' : 'text-destructive-600'}>
          Laba Bersih: <span className="font-mono tabular-nums">{fmt(data.netIncome)}</span>
        </span>
      </div>
    </div>
  );
}

function BalanceSheetSection({ data }: { data: BalanceSheet }) {
  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4">
      <h3 className="mb-3 text-body font-medium text-neutral-800">Neraca</h3>
      <StatementTable title="Aset" rows={data.assets} amountKey="amount" />
      <StatementTable title="Liabilitas" rows={data.liabilities} amountKey="amount" />
      <StatementTable title="Ekuitas" rows={data.equities} amountKey="amount" />
      <div className="mt-2 flex gap-8 border-t border-neutral-200 pt-2 text-body-sm">
        <span>Total Aset: <span className="font-mono tabular-nums">{fmt(data.totalAsset)}</span></span>
        <span>Total Liabilitas+Ekuitas: <span className="font-mono tabular-nums">{fmt(data.totalLiabEquity)}</span></span>
        <span className={data.balanced ? 'text-semantic-success' : 'text-destructive-600'}>
          {data.balanced ? 'Balance' : 'Tidak Balance'}
        </span>
      </div>
    </div>
  );
}

function ConsolidationSection({ data }: { data: Consolidation }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4">
      <table className="w-full text-left text-body">
        <thead>
          <tr className="border-b border-neutral-200">
            <th className="px-2 py-1.5 text-caption font-medium text-neutral-500">Entity</th>
            <th className="px-2 py-1.5 text-right text-caption font-medium text-neutral-500">Aset</th>
            <th className="px-2 py-1.5 text-right text-caption font-medium text-neutral-500">Liabilitas</th>
            <th className="px-2 py-1.5 text-right text-caption font-medium text-neutral-500">Ekuitas</th>
            <th className="px-2 py-1.5 text-right text-caption font-medium text-neutral-500">Pendapatan</th>
            <th className="px-2 py-1.5 text-right text-caption font-medium text-neutral-500">Beban</th>
          </tr>
        </thead>
        <tbody>
          {data.entities.map((e) => (
            <tr key={e.entityCode} className="border-t border-neutral-100">
              <td className="px-2 py-1.5 font-mono text-neutral-700">{e.entityCode}</td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums text-neutral-800">{fmt(e.totalAsset)}</td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums text-neutral-800">{fmt(e.totalLiability)}</td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums text-neutral-800">{fmt(e.totalEquity)}</td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums text-neutral-800">{fmt(e.totalRevenue)}</td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums text-neutral-800">{fmt(e.totalExpense)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-neutral-300 font-medium">
            <td className="px-2 py-1.5 text-neutral-700">Total</td>
            <td className="px-2 py-1.5 text-right font-mono tabular-nums">{fmt(data.totals.totalAsset)}</td>
            <td className="px-2 py-1.5 text-right font-mono tabular-nums">{fmt(data.totals.totalLiability)}</td>
            <td className="px-2 py-1.5 text-right font-mono tabular-nums">{fmt(data.totals.totalEquity)}</td>
            <td className="px-2 py-1.5 text-right font-mono tabular-nums">{fmt(data.totals.totalRevenue)}</td>
            <td className="px-2 py-1.5 text-right font-mono tabular-nums">{fmt(data.totals.totalExpense)}</td>
          </tr>
        </tfoot>
      </table>
      <div className="mt-2 flex gap-6 text-body-sm">
        <span>Eliminasi: <span className="font-mono tabular-nums">{fmt(data.elimination)}</span></span>
        <span>Laba Bersih: <span className="font-mono tabular-nums">{fmt(data.totals.netIncome)}</span></span>
        <span className={data.balanced ? 'text-semantic-success' : 'text-destructive-600'}>
          {data.balanced ? 'Balance' : 'Tidak Balance'}
        </span>
      </div>
    </div>
  );
}
