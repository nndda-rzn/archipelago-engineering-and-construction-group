import { useState } from 'react';
import { Badge, DataGrid } from '@aec/ui';
import { useBankAccounts, useBankGuarantees, useCashForecasts, useCashPosition, useFxExposures, usePaymentProposals } from '@/features/treasury';
import { BankAccountForm, ProposalForm, GuaranteeForm, ForecastForm, FxForm, bankColumns, proposalColumns, bgColumns } from '@/features/treasury/ui';
import { formatIdr as fmt } from '@/shared/lib/format';

const PAGE_SIZE = 20;

type Tab = 'bank-accounts' | 'cash-position' | 'proposals' | 'guarantees' | 'forecasts' | 'fx';

const TAB_LABELS: Record<Tab, string> = {
  'bank-accounts': 'Rekening Bank',
  'cash-position': 'Posisi Kas',
  proposals: 'Proposal Bayar',
  guarantees: 'Bank Guarantee',
  forecasts: 'Forecast Kas',
  fx: 'FX Exposure',
};

export function TreasuryPage() {
  const [tab, setTab] = useState<Tab>('bank-accounts');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });

  const banks = useBankAccounts({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const cashPosition = useCashPosition();
  const proposals = usePaymentProposals({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const guarantees = useBankGuarantees({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const forecasts = useCashForecasts();
  const fx = useFxExposures();

  const gridProps = { pagination, onPaginationChange: setPagination };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-h1 text-neutral-950">Treasury</h1>
        <p className="mt-1 text-body-sm text-neutral-500">Bank account, cash position, payment proposal, bank guarantee, cash forecast, FX exposure (Fase 11A)</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-body-sm font-medium transition-colors ${
              tab === t ? 'bg-racing-red-600 text-white' : 'border border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === 'bank-accounts' && (
        <>
          <BankAccountForm />
          <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
            <DataGrid columns={bankColumns} data={banks.data?.items ?? []} rowCount={banks.data?.total ?? 0} isLoading={banks.isLoading} isError={banks.isError} onRetry={() => banks.refetch()} emptyMessage="Belum ada rekening bank" {...gridProps} />
          </div>
        </>
      )}

      {tab === 'cash-position' && (
        <div className="rounded-md border border-neutral-200 bg-white p-6 shadow-xs">
          {cashPosition.isLoading && <p className="text-body-sm text-neutral-500">Menghitung posisi kas…</p>}
          {cashPosition.data && (
            <>
              <div className="mb-4 flex items-center gap-4">
                <span className="text-body-sm text-neutral-500">Total saldo:</span>
                <span className="font-mono tabular-nums text-h3 text-neutral-800">{fmt(cashPosition.data.totalBalance)}</span>
              </div>
              <table className="w-full text-left text-body">
                <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-2">Rekening</th>
                    <th className="px-4 py-2">Bank</th>
                    <th className="px-4 py-2">Entity</th>
                    <th className="px-4 py-2 text-right">Saldo Awal</th>
                    <th className="px-4 py-2 text-right">Keluar</th>
                    <th className="px-4 py-2 text-right">Saldo Kini</th>
                  </tr>
                </thead>
                <tbody>
                  {cashPosition.data.items.map((r) => (
                    <tr key={r.bankAccountId} className="border-t border-neutral-100 hover:bg-neutral-50">
                      <td className="px-4 py-2 font-mono text-neutral-800">{r.accountCode}</td>
                      <td className="px-4 py-2 text-neutral-700">{r.bankName}</td>
                      <td className="px-4 py-2 font-mono text-neutral-600">{r.legalEntityCode}</td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-700">{fmt(r.openingBalance)}</td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums text-destructive-600">{fmt(r.outflow)}</td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums font-medium text-neutral-800">{fmt(r.currentBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {tab === 'proposals' && (
        <>
          <ProposalForm />
          <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
            <DataGrid columns={proposalColumns} data={proposals.data?.items ?? []} rowCount={proposals.data?.total ?? 0} isLoading={proposals.isLoading} isError={proposals.isError} onRetry={() => proposals.refetch()} emptyMessage="Belum ada proposal pembayaran" {...gridProps} />
          </div>
        </>
      )}

      {tab === 'guarantees' && (
        <>
          <GuaranteeForm />
          <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
            <DataGrid columns={bgColumns} data={guarantees.data?.items ?? []} rowCount={guarantees.data?.total ?? 0} isLoading={guarantees.isLoading} isError={guarantees.isError} onRetry={() => guarantees.refetch()} emptyMessage="Belum ada bank guarantee" {...gridProps} />
          </div>
        </>
      )}

      {tab === 'forecasts' && (
        <>
          <ForecastForm />
          <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
            <table className="w-full text-left text-body">
              <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-2">Periode</th>
                  <th className="px-4 py-2">Entity</th>
                  <th className="px-4 py-2 text-right">Receipt</th>
                  <th className="px-4 py-2 text-right">AP</th>
                  <th className="px-4 py-2 text-right">Payroll</th>
                  <th className="px-4 py-2 text-right">Net</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {(forecasts.data?.items ?? []).map((f) => (
                  <tr key={f.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                    <td className="px-4 py-2 font-mono text-neutral-800">{f.period}</td>
                    <td className="px-4 py-2 font-mono text-neutral-600">{f.legalEntity.code}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-700">{fmt(f.expectedReceipt)}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-700">{fmt(f.expectedAp)}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-700">{fmt(f.expectedPayroll)}</td>
                    <td className={`px-4 py-2 text-right font-mono tabular-nums ${f.netForecast >= 0 ? 'text-financial-positive-500' : 'text-destructive-600'}`}>{fmt(f.netForecast)}</td>
                    <td className="px-4 py-2"><Badge variant="default">{f.status}</Badge></td>
                  </tr>
                ))}
                {(forecasts.data?.items ?? []).length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-4 text-caption text-neutral-500">Belum ada forecast kas.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'fx' && (
        <>
          <FxForm />
          <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
            <table className="w-full text-left text-body">
              <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-2">Mata Uang</th>
                  <th className="px-4 py-2">Entity</th>
                  <th className="px-4 py-2 text-right">Eksposur</th>
                  <th className="px-4 py-2 text-right">Rate</th>
                  <th className="px-4 py-2 text-right">Setara Base</th>
                </tr>
              </thead>
              <tbody>
                {(fx.data?.items ?? []).map((f) => (
                  <tr key={f.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                    <td className="px-4 py-2"><Badge variant="default">{f.currency}</Badge></td>
                    <td className="px-4 py-2 font-mono text-neutral-600">{f.legalEntity.code}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-800">{f.exposureAmount.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-600">{f.rate}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-700">{fmt(Number(f.exposureAmount) * Number(f.rate))}</td>
                  </tr>
                ))}
                {(fx.data?.items ?? []).length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-4 text-caption text-neutral-500">Belum ada FX exposure.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
