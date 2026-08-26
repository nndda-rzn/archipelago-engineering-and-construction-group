import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid, Input, Label } from '@aec/ui';
import {
  useBalanceSheet, useClosePeriod, useCompleteStep, useConsolidation, useCreateIntercompany,
  useIncomeStatement, useIntercompany, useIntercompanyReconciliation, useLockPeriod, usePeriodCloses,
  usePostIntercompany, useStartPeriodClose,
  type Intercompany, type PeriodClose,
} from '@/features/finance';
import { useLegalEntities } from '@/entities/legal-entity';
import { formatIdr as fmt } from '@/shared/lib/format';

const PAGE_SIZE = 20;

const statusVariant: Record<string, 'default' | 'success' | 'warning'> = {
  POSTED: 'success',
  DRAFT: 'default',
  OPEN: 'default',
  IN_PROGRESS: 'default',
  CLOSED: 'success',
  LOCKED: 'warning',
  REVERSED: 'warning',
};

const icHelper = createColumnHelper<Intercompany>();
const pcHelper = createColumnHelper<PeriodClose>();

const icColumns = [
  icHelper.accessor('transactionNumber', { header: 'No.', cell: (i) => <span className="font-mono text-neutral-800">{i.getValue()}</span> }),
  icHelper.accessor('fromEntity', { header: 'Dari', cell: (i) => <span className="font-mono text-neutral-700">{i.getValue()?.code}</span> }),
  icHelper.accessor('toEntity', { header: 'Ke', cell: (i) => <span className="font-mono text-neutral-700">{i.getValue()?.code}</span> }),
  icHelper.accessor('amount', { header: 'Nilai', cell: (i) => <span className="font-mono tabular-nums text-neutral-800">{fmt(i.getValue())}</span> }),
  icHelper.accessor('currency', { header: 'Mata Uang', cell: (i) => <Badge variant="default">{i.getValue()}</Badge> }),
  icHelper.accessor('description', { header: 'Keterangan', cell: (i) => <span className="max-w-[200px] truncate text-neutral-600">{i.getValue() ?? '—'}</span> }),
  icHelper.accessor('status', { header: 'Status', cell: (i) => <Badge variant={statusVariant[i.getValue()] ?? 'default'}>{i.getValue()}</Badge> }),
  icHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const post = usePostIntercompany();
      if (row.original.status !== 'DRAFT') return null;
      return <Button size="sm" variant="secondary" loading={post.isPending} onClick={() => post.mutate(row.original.id)}>Post</Button>;
    },
  }),
];

const pcColumns = [
  pcHelper.accessor('legalEntity', { header: 'Entity', cell: (i) => <span className="font-mono text-neutral-700">{i.getValue()?.code}</span> }),
  pcHelper.accessor('period', { header: 'Periode', cell: (i) => <span className="font-mono text-neutral-800">{i.getValue()}</span> }),
  pcHelper.accessor('journalCount', { header: 'Journal', cell: (i) => <span className="font-mono tabular-nums text-neutral-600">{i.getValue()}</span> }),
  pcHelper.accessor('status', { header: 'Status', cell: (i) => <Badge variant={statusVariant[i.getValue()] ?? 'default'}>{i.getValue()}</Badge> }),
  pcHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const step = useCompleteStep();
      const close = useClosePeriod();
      const lock = useLockPeriod();
      const p = row.original;
      const steps = (p.steps as Record<string, boolean> | null) ?? {};
      const pendingStep = ['cutoff', 'accrual', 'depreciation', 'revaluation', 'reconciliation', 'closing'].find((s) => !steps[s]);
      return (
        <div className="flex gap-1">
          {p.status === 'IN_PROGRESS' && pendingStep && (
            <Button size="sm" variant="ghost" loading={step.isPending} onClick={() => step.mutate({ id: p.id, step: pendingStep })}>{pendingStep}</Button>
          )}
          {p.status === 'IN_PROGRESS' && !pendingStep && (
            <Button size="sm" variant="secondary" loading={close.isPending} onClick={() => close.mutate({ id: p.id })}>Close</Button>
          )}
          {p.status === 'CLOSED' && (
            <Button size="sm" variant="secondary" loading={lock.isPending} onClick={() => lock.mutate({ id: p.id })}>Lock</Button>
          )}
        </div>
      );
    },
  }),
];

type Tab = 'intercompany' | 'period-close' | 'income-statement' | 'balance-sheet' | 'consolidation';

export function FinanceClosurePage() {
  const [tab, setTab] = useState<Tab>('intercompany');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [entityId, setEntityId] = useState('');

  const intercompany = useIntercompany({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const reconciliation = useIntercompanyReconciliation();
  const periodCloses = usePeriodCloses();
  const incomeStatement = useIncomeStatement({ legalEntityId: entityId });
  const balanceSheet = useBalanceSheet({ legalEntityId: entityId });
  const consolidation = useConsolidation();

  const gridProps = { pagination, onPaginationChange: setPagination };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-h1 text-neutral-950">Finance Closure</h1>
        <p className="mt-1 text-body-sm text-neutral-500">Intercompany, period close, income statement, balance sheet, consolidation (Fase 11D)</p>
      </div>

      <div className="mb-4 flex gap-2">
        {(['intercompany', 'period-close', 'income-statement', 'balance-sheet', 'consolidation'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-body-sm font-medium transition-colors ${
              tab === t ? 'bg-racing-red-600 text-white' : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300'
            }`}
          >
            {t === 'intercompany' ? 'Intercompany' : t === 'period-close' ? 'Period Close' : t === 'income-statement' ? 'Laba Rugi' : t === 'balance-sheet' ? 'Neraca' : 'Konsolidasi'}
          </button>
        ))}
      </div>

      {tab === 'intercompany' && (
        <>
          <IntercompanyForm />
          <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
            <h3 className="text-h3 text-neutral-900">Rekonsiliasi</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {(reconciliation.data?.items ?? []).map((r) => (
                <span key={`${r.fromCode}|${r.toCode}`} className="inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-body-sm">
                  <span className="font-mono text-neutral-700">{r.fromCode} → {r.toCode}</span>
                  <span className="font-mono tabular-nums text-neutral-800">{fmt(r.amount)}</span>
                  <Badge variant={r.reconciled ? 'success' : 'warning'}>{r.reconciled ? 'Balanced' : 'Open'}</Badge>
                </span>
              ))}
              {(reconciliation.data?.items ?? []).length === 0 && <p className="text-caption text-neutral-500">Belum ada transaksi intercompany POSTED.</p>}
            </div>
          </div>
          <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
            <DataGrid columns={icColumns} data={intercompany.data?.items ?? []} rowCount={intercompany.data?.total ?? 0} isLoading={intercompany.isLoading} isError={intercompany.isError} onRetry={() => intercompany.refetch()} emptyMessage="Belum ada transaksi intercompany" {...gridProps} />
          </div>
        </>
      )}

      {tab === 'period-close' && (
        <>
          <PeriodCloseForm />
          <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
            <DataGrid columns={pcColumns} data={periodCloses.data?.items ?? []} rowCount={periodCloses.data?.items.length ?? 0} isLoading={periodCloses.isLoading} isError={false} emptyMessage="Belum ada period close" />
          </div>
        </>
      )}

      {tab === 'income-statement' && (
        <>
          <EntitySelector entityId={entityId} setEntityId={setEntityId} />
          <div className="rounded-md border border-neutral-200 bg-white p-6 shadow-xs">
            {!entityId && <p className="text-body-sm text-neutral-500">Pilih legal entity.</p>}
            {incomeStatement.isLoading && entityId && <p className="text-body-sm text-neutral-500">Menghitung…</p>}
            {incomeStatement.data && (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-h3 text-neutral-900">Laba Rugi — {incomeStatement.data.legalName}</h3>
                  <span className="text-caption text-neutral-500">{new Date(incomeStatement.data.generatedAt).toLocaleString('id-ID')}</span>
                </div>
                <StatementTable title="Pendapatan" rows={incomeStatement.data.revenue} amountKey="amount" />
                <StatementTable title="Beban" rows={incomeStatement.data.expenses} amountKey="amount" />
                <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-3">
                  <span className="text-body-sm font-medium text-neutral-700">Laba Bersih</span>
                  <span className={`font-mono tabular-nums text-h3 ${incomeStatement.data.netIncome >= 0 ? 'text-semantic-success' : 'text-destructive-600'}`}>{fmt(incomeStatement.data.netIncome)}</span>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {tab === 'balance-sheet' && (
        <>
          <EntitySelector entityId={entityId} setEntityId={setEntityId} />
          <div className="rounded-md border border-neutral-200 bg-white p-6 shadow-xs">
            {!entityId && <p className="text-body-sm text-neutral-500">Pilih legal entity.</p>}
            {balanceSheet.isLoading && entityId && <p className="text-body-sm text-neutral-500">Menghitung…</p>}
            {balanceSheet.data && (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-h3 text-neutral-900">Neraca — {balanceSheet.data.legalName}</h3>
                  <Badge variant={balanceSheet.data.balanced ? 'success' : 'warning'}>{balanceSheet.data.balanced ? 'Balanced ✓' : 'Tidak Balance'}</Badge>
                </div>
                <StatementTable title="Aset" rows={balanceSheet.data.assets} amountKey="amount" />
                <StatementTable title="Liabilitas" rows={balanceSheet.data.liabilities} amountKey="amount" />
                <StatementTable title="Ekuitas" rows={balanceSheet.data.equities} amountKey="amount" />
                <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-3">
                  <span className="text-body-sm font-medium text-neutral-700">Total Aset = Liabilitas + Ekuitas</span>
                  <span className="font-mono tabular-nums text-h3 text-neutral-800">{fmt(balanceSheet.data.totalAsset)}</span>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {tab === 'consolidation' && (
        <div className="rounded-md border border-neutral-200 bg-white p-6 shadow-xs">
          {consolidation.isLoading && <p className="text-body-sm text-neutral-500">Mengkonsolidasi…</p>}
          {consolidation.data && (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-h3 text-neutral-900">Konsolidasi Group</h3>
                <Badge variant={consolidation.data.balanced ? 'success' : 'warning'}>{consolidation.data.balanced ? 'Balanced ✓' : 'Tidak Balance'}</Badge>
              </div>
              <table className="w-full text-left text-body">
                <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-2">Entity</th>
                    <th className="px-4 py-2 text-right">Aset</th>
                    <th className="px-4 py-2 text-right">Liabilitas</th>
                    <th className="px-4 py-2 text-right">Ekuitas</th>
                    <th className="px-4 py-2 text-right">Pendapatan</th>
                    <th className="px-4 py-2 text-right">Beban</th>
                  </tr>
                </thead>
                <tbody>
                  {consolidation.data.entities.map((e) => (
                    <tr key={e.entityCode} className="border-t border-neutral-100 hover:bg-neutral-50">
                      <td className="px-4 py-2 font-mono text-neutral-800">{e.entityCode}</td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-700">{fmt(e.totalAsset)}</td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-700">{fmt(e.totalLiability)}</td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-700">{fmt(e.totalEquity)}</td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-700">{fmt(e.totalRevenue)}</td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-700">{fmt(e.totalExpense)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-neutral-200 bg-neutral-50">
                    <td className="px-4 py-2 font-mono font-medium text-neutral-800">Eliminasi Intercompany</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-destructive-600">−{fmt(consolidation.data.elimination)}</td>
                    <td colSpan={4} />
                  </tr>
                  <tr className="border-t border-neutral-200 bg-neutral-50">
                    <td className="px-4 py-2 font-mono font-medium text-neutral-800">TOTAL</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums font-medium text-neutral-900">{fmt(consolidation.data.totals.totalAsset)}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-800">{fmt(consolidation.data.totals.totalLiability)}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-800">{fmt(consolidation.data.totals.totalEquity)}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-800">{fmt(consolidation.data.totals.totalRevenue)}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-800">{fmt(consolidation.data.totals.totalExpense)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-3 text-caption text-neutral-500">Laba bersih konsolidasi: <span className={`font-mono ${consolidation.data.totals.netIncome >= 0 ? 'text-semantic-success' : 'text-destructive-600'}`}>{fmt(consolidation.data.totals.netIncome)}</span></p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function IntercompanyForm() {
  const { data: entities } = useLegalEntities({ page: 1, pageSize: 100 });
  const create = useCreateIntercompany();
  const [fromEntityId, setFromEntityId] = useState('');
  const [toEntityId, setToEntityId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const onSubmit = () => {
    if (!fromEntityId || !toEntityId || !amount) return;
    create.mutate(
      { fromEntityId, toEntityId, amount: Number(amount), description: description || undefined },
      { onSuccess: () => { setFromEntityId(''); setToEntityId(''); setAmount(''); setDescription(''); } },
    );
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="ic-from">Dari Entity</Label>
          <select id="ic-from" value={fromEntityId} onChange={(e) => setFromEntityId(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Pilih…</option>
            {(entities?.items ?? []).map((e) => <option key={e.id} value={e.id}>{e.code}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="ic-to">Ke Entity</Label>
          <select id="ic-to" value={toEntityId} onChange={(e) => setToEntityId(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Pilih…</option>
            {(entities?.items ?? []).map((e) => <option key={e.id} value={e.id}>{e.code}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="ic-amt">Nilai</Label>
          <Input id="ic-amt" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} className="w-32" />
        </div>
        <div className="flex-1">
          <Label htmlFor="ic-desc">Keterangan</Label>
          <Input id="ic-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat IC</Button>
      </div>
    </div>
  );
}

function PeriodCloseForm() {
  const { data: entities } = useLegalEntities({ page: 1, pageSize: 100 });
  const start = useStartPeriodClose();
  const [legalEntityId, setLegalEntityId] = useState('');
  const [period, setPeriod] = useState('');
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="pc-entity">Entity</Label>
          <select id="pc-entity" value={legalEntityId} onChange={(e) => setLegalEntityId(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Pilih…</option>
            {(entities?.items ?? []).map((e) => <option key={e.id} value={e.id}>{e.code}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="pc-period">Periode</Label>
          <Input id="pc-period" value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-08" />
        </div>
        <Button onClick={() => { if (legalEntityId && period) start.mutate({ legalEntityId, period }, { onSuccess: () => setPeriod('') }); }} loading={start.isPending}>
          Mulai Period Close
        </Button>
      </div>
    </div>
  );
}

function EntitySelector({ entityId, setEntityId }: { entityId: string; setEntityId: (v: string) => void }) {
  const { data: entities } = useLegalEntities({ page: 1, pageSize: 100 });
  return (
    <div className="mb-4 w-72">
      <Label htmlFor="fs-entity">Legal Entity</Label>
      <select id="fs-entity" value={entityId} onChange={(e) => setEntityId(e.target.value)} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body text-neutral-900 hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20">
        <option value="">Pilih…</option>
        {(entities?.items ?? []).map((e) => <option key={e.id} value={e.id}>{e.code} — {e.legalName}</option>)}
      </select>
    </div>
  );
}

function StatementTable({ title, rows, amountKey }: { title: string; rows: Array<{ code: string; name: string; [k: string]: unknown }>; amountKey: string }) {
  return (
    <div className="mb-4">
      <h4 className="mb-2 text-caption font-medium uppercase tracking-wide text-neutral-500">{title}</h4>
      <table className="w-full text-left text-body">
        <tbody>
          {rows.map((r) => (
            <tr key={r.code} className="border-t border-neutral-100">
              <td className="px-2 py-1.5 font-mono text-neutral-600">{r.code}</td>
              <td className="px-2 py-1.5 text-neutral-800">{r.name}</td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums text-neutral-700">{fmt(Number(r[amountKey] ?? 0))}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={3} className="px-2 py-2 text-caption text-neutral-500">Tidak ada saldo.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
