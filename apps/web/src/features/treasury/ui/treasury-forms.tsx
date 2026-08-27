import { useState } from 'react';
import { Button, Input, Label } from '@aec/ui';
import { useCreateBankAccount, useCreateBankGuarantee, useCreateCashForecast, useCreateFxExposure, useCreatePaymentProposal, useBankAccounts } from '../model/treasury.api';
import { useLegalEntities } from '@/entities/legal-entity';
import { useProjects } from '@/entities/project';

export function BankAccountForm() {
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

export function ProposalForm() {
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

export function GuaranteeForm() {
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

export function ForecastForm() {
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

export function FxForm() {
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
