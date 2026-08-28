import { useState } from 'react';
import { DataGrid } from '@aec/ui';
import { useBankAccounts, useBankGuarantees, useCashForecasts, useCashPosition, useFxExposures, usePaymentProposals } from '@/features/treasury';
import { BankAccountForm, ProposalForm, GuaranteeForm, ForecastForm, FxForm, bankColumns, proposalColumns, bgColumns, CashPositionSection, CashForecastSection, FxExposureSection } from '@/features/treasury/ui';
import { PAGE_SIZE } from '@/shared/lib/pagination';

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
        <>
          {cashPosition.isLoading && <p className="text-body-sm text-neutral-500">Menghitung posisi kas…</p>}
          {cashPosition.data && <CashPositionSection data={cashPosition.data} />}
        </>
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
          <CashForecastSection items={forecasts.data?.items ?? []} />
        </>
      )}

      {tab === 'fx' && (
        <>
          <FxForm />
          <FxExposureSection items={fx.data?.items ?? []} />
        </>
      )}
    </div>
  );
}
