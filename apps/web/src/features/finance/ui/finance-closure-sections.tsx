import type { BalanceSheet, Consolidation, IncomeStatement, IntercompanyReconciliation } from '@aec/api-contracts';
import { StatementTable } from './finance-closure-forms';
import { formatIdr as fmt } from '@/shared/lib/format';

export function ReconciliationSummary({ data }: { data: IntercompanyReconciliation }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4">
      <dl className="mb-3 flex gap-8 text-body"><div><dt className="text-caption text-neutral-500">Total Transactions</dt><dd className="font-mono tabular-nums text-neutral-800">{data.total}</dd></div></dl>
      <div className="overflow-x-auto">
      <table className="w-full text-left text-body">
        <thead><tr className="border-b border-neutral-200"><th className="px-2 py-1.5 text-caption font-medium text-neutral-500">From</th><th className="px-2 py-1.5 text-caption font-medium text-neutral-500">To</th><th className="px-2 py-1.5 text-right text-caption font-medium text-neutral-500">Amount</th><th className="px-2 py-1.5 text-right text-caption font-medium text-neutral-500">Reciprocal</th><th className="px-2 py-1.5 text-caption font-medium text-neutral-500">Reconciled</th></tr></thead>
        <tbody>
          {data.items.map((item, index) => <tr key={index} className="border-t border-neutral-100"><td className="px-2 py-1.5 font-mono text-neutral-700">{item.fromCode}</td><td className="px-2 py-1.5 font-mono text-neutral-700">{item.toCode}</td><td className="px-2 py-1.5 text-right font-mono tabular-nums text-neutral-800">{fmt(item.amount)}</td><td className="px-2 py-1.5 text-right font-mono tabular-nums text-neutral-800">{fmt(item.reciprocalAmount)}</td><td className="px-2 py-1.5"><span className={item.reconciled ? 'text-financial-positive-500' : 'text-destructive-600'}>{item.reconciled ? 'Yes' : 'No'}</span></td></tr>)}
          {data.items.length === 0 && <tr><td colSpan={5} className="px-2 py-2 text-caption text-neutral-500">No reconciliation data.</td></tr>}
        </tbody>
      </table>
      </div>
    </div>
  );
}

export function IncomeStatementSection({ data }: { data: IncomeStatement }) {
  return <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4"><h3 className="mb-3 text-body font-medium text-neutral-800">Income Statement</h3><StatementTable title="Revenue" rows={data.revenue} amountKey="amount" /><StatementTable title="Expenses" rows={data.expenses} amountKey="amount" /><div className="mt-2 flex gap-8 border-t border-neutral-200 pt-2 text-body-sm"><span>Total Revenue: <span className="font-mono tabular-nums">{fmt(data.totalRevenue)}</span></span><span>Total Expenses: <span className="font-mono tabular-nums">{fmt(data.totalExpense)}</span></span><span className={data.netIncome >= 0 ? 'text-financial-positive-500' : 'text-destructive-600'}>Net Income: <span className="font-mono tabular-nums">{fmt(data.netIncome)}</span></span></div></div>;
}

export function BalanceSheetSection({ data }: { data: BalanceSheet }) {
  return <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4"><h3 className="mb-3 text-body font-medium text-neutral-800">Balance Sheet</h3><StatementTable title="Assets" rows={data.assets} amountKey="amount" /><StatementTable title="Liabilities" rows={data.liabilities} amountKey="amount" /><StatementTable title="Equity" rows={data.equities} amountKey="amount" /><div className="mt-2 flex gap-8 border-t border-neutral-200 pt-2 text-body-sm"><span>Total Assets: <span className="font-mono tabular-nums">{fmt(data.totalAsset)}</span></span><span>Total Liabilities+Equity: <span className="font-mono tabular-nums">{fmt(data.totalLiabEquity)}</span></span><span className={data.balanced ? 'text-financial-positive-500' : 'text-destructive-600'}>{data.balanced ? 'Balanced' : 'Not Balanced'}</span></div></div>;
}

export function ConsolidationSection({ data }: { data: Consolidation }) {
  return <div className="rounded-md border border-neutral-200 bg-white p-4"><div className="overflow-x-auto"><table className="w-full text-left text-body"><thead><tr className="border-b border-neutral-200"><th className="px-2 py-1.5 text-caption font-medium text-neutral-500">Entity</th><th className="px-2 py-1.5 text-right text-caption font-medium text-neutral-500">Assets</th><th className="px-2 py-1.5 text-right text-caption font-medium text-neutral-500">Liabilities</th><th className="px-2 py-1.5 text-right text-caption font-medium text-neutral-500">Equity</th><th className="px-2 py-1.5 text-right text-caption font-medium text-neutral-500">Revenue</th><th className="px-2 py-1.5 text-right text-caption font-medium text-neutral-500">Expenses</th></tr></thead><tbody>{data.entities.map((e) => <tr key={e.entityCode} className="border-t border-neutral-100"><td className="px-2 py-1.5 font-mono text-neutral-700">{e.entityCode}</td><td className="px-2 py-1.5 text-right font-mono tabular-nums">{fmt(e.totalAsset)}</td><td className="px-2 py-1.5 text-right font-mono tabular-nums">{fmt(e.totalLiability)}</td><td className="px-2 py-1.5 text-right font-mono tabular-nums">{fmt(e.totalEquity)}</td><td className="px-2 py-1.5 text-right font-mono tabular-nums">{fmt(e.totalRevenue)}</td><td className="px-2 py-1.5 text-right font-mono tabular-nums">{fmt(e.totalExpense)}</td></tr>)}</tbody><tfoot><tr className="border-t-2 border-neutral-300 font-medium"><td className="px-2 py-1.5">Total</td><td className="px-2 py-1.5 text-right font-mono tabular-nums">{fmt(data.totals.totalAsset)}</td><td className="px-2 py-1.5 text-right font-mono tabular-nums">{fmt(data.totals.totalLiability)}</td><td className="px-2 py-1.5 text-right font-mono tabular-nums">{fmt(data.totals.totalEquity)}</td><td className="px-2 py-1.5 text-right font-mono tabular-nums">{fmt(data.totals.totalRevenue)}</td><td className="px-2 py-1.5 text-right font-mono tabular-nums">{fmt(data.totals.totalExpense)}</td></tr></tfoot></table></div><div className="mt-2 flex gap-6 text-body-sm"><span>Eliminasi: <span className="font-mono tabular-nums">{fmt(data.elimination)}</span></span><span>Laba Bersih: <span className="font-mono tabular-nums">{fmt(data.totals.netIncome)}</span></span><span className={data.balanced ? 'text-financial-positive-500' : 'text-destructive-600'}>{data.balanced ? 'Balance' : 'Tidak Balance'}</span></div></div>;
}
