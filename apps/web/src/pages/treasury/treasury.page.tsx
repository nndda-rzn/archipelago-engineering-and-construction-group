import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid, Input, Label } from '@aec/ui';
import {
  useBankAccounts, useBankGuarantees, useCashForecasts, useCashPosition, useCreateBankAccount,
  useCreateBankGuarantee, useCreateCashForecast, useCreateFxExposure, useCreatePaymentProposal,
  useFxExposures, usePaymentProposals, useApproveProposal, useReleaseProposal, useSubmitProposal,
  type BankAccount, type BankGuarantee, type PaymentProposal,
} from '@/features/treasury';
import { useLegalEntities } from '@/entities/legal-entity';
import { useProjects } from '@/entities/project';
import { formatIdr as fmt } from '@/shared/lib/format';

const PAGE_SIZE = 20;

const statusVariant: Record<string, 'default' | 'success' | 'warning'> = {
  ACTIVE: 'success',
  DRAFT: 'default',
  SUBMITTED: 'default',
  APPROVED: 'success',
  RELEASED: 'success',
  EXPIRED: 'warning',
  RETURNED: 'default',
  CLAIMED: 'warning',
  INACTIVE: 'warning',
  BLOCKED: 'warning',
};

const bankHelper = createColumnHelper<BankAccount>();
const proposalHelper = createColumnHelper<PaymentProposal>();
const bgHelper = createColumnHelper<BankGuarantee>();

const bankColumns = [
  bankHelper.accessor('accountCode', { header: 'Kode', cell: (i) => <span className="font-mono text-neutral-800">{i.getValue()}</span> }),
  bankHelper.accessor('bankName', { header: 'Bank', cell: (i) => <span className="text-neutral-800 font-medium">{i.getValue()}</span> }),
  bankHelper.accessor('accountNumber', { header: 'No. Rekening', cell: (i) => <span className="font-mono text-neutral-600">{i.getValue()}</span> }),
  bankHelper.accessor('currency', { header: 'Mata Uang', cell: (i) => <Badge variant="default">{i.getValue()}</Badge> }),
  bankHelper.accessor('legalEntity', { header: 'Entity', cell: (i) => <span className="font-mono text-neutral-600">{i.getValue()?.code}</span> }),
  bankHelper.accessor('openingBalance', { header: 'Saldo Awal', cell: (i) => <span className="font-mono tabular-nums text-neutral-800">{fmt(i.getValue())}</span> }),
  bankHelper.accessor('status', { header: 'Status', cell: (i) => <Badge variant={statusVariant[i.getValue()] ?? 'default'}>{i.getValue()}</Badge> }),
];

const proposalColumns = [
  proposalHelper.accessor('proposalNumber', { header: 'No.', cell: (i) => <span className="font-mono text-neutral-800">{i.getValue()}</span> }),
  proposalHelper.accessor('vendor', { header: 'Vendor', cell: (i) => <span className="text-neutral-700">{i.getValue()}</span> }),
  proposalHelper.accessor('totalAmount', { header: 'Nilai', cell: (i) => <span className="font-mono tabular-nums text-neutral-800">{fmt(i.getValue())}</span> }),
  proposalHelper.accessor('bankAccount', { header: 'Rekening', cell: (i) => <span className="font-mono text-neutral-600">{i.getValue() ? `${i.getValue()!.bankName} ${i.getValue()!.accountCode}` : '—'}</span> }),
  proposalHelper.accessor('status', { header: 'Status', cell: (i) => <Badge variant={statusVariant[i.getValue()] ?? 'default'}>{i.getValue()}</Badge> }),
  proposalHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const submit = useSubmitProposal();
      const approve = useApproveProposal();
      const release = useReleaseProposal();
      const p = row.original;
      if (p.status === 'DRAFT') {
        return <Button size="sm" variant="secondary" loading={submit.isPending} onClick={() => submit.mutate(p.id)}>Submit</Button>;
      }
      if (p.status === 'SUBMITTED') {
        return <Button size="sm" variant="secondary" loading={approve.isPending} onClick={() => approve.mutate(p.id)}>Approve</Button>;
      }
      if (p.status === 'APPROVED') {
        return <Button size="sm" variant="secondary" loading={release.isPending} onClick={() => release.mutate(p.id)}>Release</Button>;
      }
      return null;
    },
  }),
];

const bgColumns = [
  bgHelper.accessor('guaranteeNumber', { header: 'No.', cell: (i) => <span className="font-mono text-neutral-800">{i.getValue()}</span> }),
  bgHelper.accessor('guaranteeType', { header: 'Tipe', cell: (i) => <Badge variant="default">{i.getValue()}</Badge> }),
  bgHelper.accessor('beneficiary', { header: 'Beneficiary', cell: (i) => <span className="text-neutral-700">{i.getValue()}</span> }),
  bgHelper.accessor('bankName', { header: 'Bank', cell: (i) => <span className="text-neutral-600">{i.getValue()}</span> }),
  bgHelper.accessor('amount', { header: 'Nilai', cell: (i) => <span className="font-mono tabular-nums text-neutral-800">{fmt(i.getValue())}</span> }),
  bgHelper.accessor('expiryDate', { header: 'Expiry', cell: (i) => <span className="font-mono text-neutral-600">{i.getValue() ? new Date(i.getValue()!).toLocaleDateString('id-ID') : '—'}</span> }),
  bgHelper.accessor('status', { header: 'Status', cell: (i) => <Badge variant={statusVariant[i.getValue()] ?? 'default'}>{i.getValue()}</Badge> }),
];

type Tab = 'bank-accounts' | 'cash-position' | 'proposals' | 'guarantees' | 'forecasts' | 'fx';

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

      <div className="mb-4 flex gap-2">
        {(['bank-accounts', 'cash-position', 'proposals', 'guarantees', 'forecasts', 'fx'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-body-sm font-medium transition-colors ${
              tab === t ? 'bg-racing-red-600 text-white' : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300'
            }`}
          >
            {t === 'bank-accounts' ? 'Rekening Bank' : t === 'cash-position' ? 'Posisi Kas' : t === 'proposals' ? 'Proposal Bayar' : t === 'guarantees' ? 'Bank Guarantee' : t === 'forecasts' ? 'Forecast Kas' : 'FX Exposure'}
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
                      <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-800 font-medium">{fmt(r.currentBalance)}</td>
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
                    <td className={`px-4 py-2 text-right font-mono tabular-nums ${f.netForecast >= 0 ? 'text-semantic-success' : 'text-destructive-600'}`}>{fmt(f.netForecast)}</td>
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
                  <th className="px-4 py-2 text-right">Setara {`Base`}</th>
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

function BankAccountForm() {
  const { data: entities } = useLegalEntities({ page: 1, pageSize: 100 });
  const create = useCreateBankAccount();
  const [legalEntityId, setLegalEntityId] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [currency, setCurrency] = useState('IDR');
  const [openingBalance, setOpeningBalance] = useState('');
  const onSubmit = () => {
    if (!legalEntityId || !bankCode || !bankName || !accountNumber || !accountName) return;
    create.mutate(
      { legalEntityId, bankCode, bankName, accountNumber, accountName, currency, openingBalance: openingBalance ? Number(openingBalance) : undefined },
      { onSuccess: () => { setBankCode(''); setBankName(''); setAccountNumber(''); setAccountName(''); setOpeningBalance(''); } },
    );
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="ba-entity">Entity</Label>
          <select id="ba-entity" value={legalEntityId} onChange={(e) => setLegalEntityId(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Pilih…</option>
            {(entities?.items ?? []).map((e) => <option key={e.id} value={e.id}>{e.code}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="ba-code">Kode Bank</Label>
          <Input id="ba-code" value={bankCode} onChange={(e) => setBankCode(e.target.value)} placeholder="BCA" />
        </div>
        <div className="flex-1">
          <Label htmlFor="ba-name">Nama Bank</Label>
          <Input id="ba-name" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank Central Asia" />
        </div>
        <div>
          <Label htmlFor="ba-num">No. Rekening</Label>
          <Input id="ba-num" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ba-acct">Atas Nama</Label>
          <Input id="ba-acct" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ba-ccy">Mata Uang</Label>
          <select id="ba-ccy" value={currency} onChange={(e) => setCurrency(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            {['IDR', 'USD', 'EUR', 'SGD', 'JPY'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="ba-bal">Saldo Awal</Label>
          <Input id="ba-bal" type="number" min={0} value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} className="w-32" />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat Rekening</Button>
      </div>
    </div>
  );
}

function ProposalForm() {
  const { data: entities } = useLegalEntities({ page: 1, pageSize: 100 });
  const { data: banks } = useBankAccounts({ page: 1, pageSize: 100 });
  const create = useCreatePaymentProposal();
  const [legalEntityId, setLegalEntityId] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [vendor, setVendor] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const onSubmit = () => {
    if (!legalEntityId || !vendor || !totalAmount) return;
    create.mutate(
      { legalEntityId, vendor, totalAmount: Number(totalAmount), bankAccountId: bankAccountId || undefined },
      { onSuccess: () => { setVendor(''); setTotalAmount(''); setBankAccountId(''); } },
    );
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="pp-entity">Entity</Label>
          <select id="pp-entity" value={legalEntityId} onChange={(e) => setLegalEntityId(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Pilih…</option>
            {(entities?.items ?? []).map((e) => <option key={e.id} value={e.id}>{e.code}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="pp-bank">Rekening</Label>
          <select id="pp-bank" value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">—</option>
            {(banks?.items ?? []).map((b) => <option key={b.id} value={b.id}>{b.bankName} {b.accountNumber}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <Label htmlFor="pp-vendor">Vendor</Label>
          <Input id="pp-vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="pp-amt">Nilai</Label>
          <Input id="pp-amt" type="number" min={0} value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} className="w-36" />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat Proposal</Button>
      </div>
    </div>
  );
}

function GuaranteeForm() {
  const { data: entities } = useLegalEntities({ page: 1, pageSize: 100 });
  const { data: projects } = useProjects({ page: 1, pageSize: 100 });
  const create = useCreateBankGuarantee();
  const [legalEntityId, setLegalEntityId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [guaranteeType, setGuaranteeType] = useState('PERFORMANCE');
  const [beneficiary, setBeneficiary] = useState('');
  const [bankName, setBankName] = useState('');
  const [amount, setAmount] = useState('');
  const onSubmit = () => {
    if (!legalEntityId || !beneficiary || !bankName || !amount) return;
    create.mutate(
      { legalEntityId, projectId: projectId || undefined, guaranteeType, beneficiary, bankName, amount: Number(amount) },
      { onSuccess: () => { setBeneficiary(''); setBankName(''); setAmount(''); } },
    );
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="bg-entity">Entity</Label>
          <select id="bg-entity" value={legalEntityId} onChange={(e) => setLegalEntityId(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Pilih…</option>
            {(entities?.items ?? []).map((e) => <option key={e.id} value={e.id}>{e.code}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="bg-project">Project</Label>
          <select id="bg-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">—</option>
            {(projects?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="bg-type">Tipe</Label>
          <select id="bg-type" value={guaranteeType} onChange={(e) => setGuaranteeType(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            {['BID', 'PERFORMANCE', 'ADVANCE', 'RETENTION', 'MAINTENANCE'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <Label htmlFor="bg-benef">Beneficiary</Label>
          <Input id="bg-benef" value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="bg-bank">Bank</Label>
          <Input id="bg-bank" value={bankName} onChange={(e) => setBankName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="bg-amt">Nilai</Label>
          <Input id="bg-amt" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} className="w-32" />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat BG</Button>
      </div>
    </div>
  );
}

function ForecastForm() {
  const { data: entities } = useLegalEntities({ page: 1, pageSize: 100 });
  const create = useCreateCashForecast();
  const [legalEntityId, setLegalEntityId] = useState('');
  const [period, setPeriod] = useState('');
  const [receipt, setReceipt] = useState('');
  const [ap, setAp] = useState('');
  const [payroll, setPayroll] = useState('');
  const onSubmit = () => {
    if (!legalEntityId || !period) return;
    create.mutate(
      { legalEntityId, period, expectedReceipt: receipt ? Number(receipt) : undefined, expectedAp: ap ? Number(ap) : undefined, expectedPayroll: payroll ? Number(payroll) : undefined },
      { onSuccess: () => { setPeriod(''); setReceipt(''); setAp(''); setPayroll(''); } },
    );
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="cf-entity">Entity</Label>
          <select id="cf-entity" value={legalEntityId} onChange={(e) => setLegalEntityId(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Pilih…</option>
            {(entities?.items ?? []).map((e) => <option key={e.id} value={e.id}>{e.code}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="cf-period">Periode</Label>
          <Input id="cf-period" value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-09" />
        </div>
        <div>
          <Label htmlFor="cf-receipt">Receipt</Label>
          <Input id="cf-receipt" type="number" min={0} value={receipt} onChange={(e) => setReceipt(e.target.value)} className="w-32" />
        </div>
        <div>
          <Label htmlFor="cf-ap">AP</Label>
          <Input id="cf-ap" type="number" min={0} value={ap} onChange={(e) => setAp(e.target.value)} className="w-32" />
        </div>
        <div>
          <Label htmlFor="cf-payroll">Payroll</Label>
          <Input id="cf-payroll" type="number" min={0} value={payroll} onChange={(e) => setPayroll(e.target.value)} className="w-32" />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat Forecast</Button>
      </div>
    </div>
  );
}

function FxForm() {
  const { data: entities } = useLegalEntities({ page: 1, pageSize: 100 });
  const create = useCreateFxExposure();
  const [legalEntityId, setLegalEntityId] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [exposureAmount, setExposureAmount] = useState('');
  const [rate, setRate] = useState('');
  const onSubmit = () => {
    if (!legalEntityId || !currency || !exposureAmount) return;
    create.mutate(
      { legalEntityId, currency, exposureAmount: Number(exposureAmount), rate: rate ? Number(rate) : undefined },
      { onSuccess: () => { setExposureAmount(''); setRate(''); } },
    );
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="fx-entity">Entity</Label>
          <select id="fx-entity" value={legalEntityId} onChange={(e) => setLegalEntityId(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Pilih…</option>
            {(entities?.items ?? []).map((e) => <option key={e.id} value={e.id}>{e.code}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="fx-ccy">Mata Uang</Label>
          <select id="fx-ccy" value={currency} onChange={(e) => setCurrency(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            {['USD', 'EUR', 'SGD', 'JPY', 'GBP', 'CNY'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="fx-amt">Eksposur</Label>
          <Input id="fx-amt" type="number" min={0} value={exposureAmount} onChange={(e) => setExposureAmount(e.target.value)} className="w-36" />
        </div>
        <div>
          <Label htmlFor="fx-rate">Rate</Label>
          <Input id="fx-rate" type="number" step="0.000001" min={0} value={rate} onChange={(e) => setRate(e.target.value)} placeholder="16000" className="w-32" />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat FX</Button>
      </div>
    </div>
  );
}
