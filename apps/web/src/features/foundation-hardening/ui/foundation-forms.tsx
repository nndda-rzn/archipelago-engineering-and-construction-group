import { useState } from 'react';
import { Badge, Button, Input, Label } from '@aec/ui';
import {
  useCreateCurrency, useCreateDoaRule, useCreateExchangeRate,
  useCreateOrganization, useResolveDoa,
} from '../model/foundation-hardening.api';
import { useLegalEntities } from '@/entities/legal-entity';
import { formatNumber } from '@/shared/lib/format';

export function OrgForm() {
  const { data: entities } = useLegalEntities({ page: 1, pageSize: 100 });
  const create = useCreateOrganization();
  const [legalEntityId, setLegalEntityId] = useState('');
  const [name, setName] = useState('');
  const [orgType, setOrgType] = useState('BUSINESS_UNIT');
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="orgf-entity">Entity</Label>
          <select id="orgf-entity" value={legalEntityId} onChange={(e) => setLegalEntityId(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Pilih…</option>
            {(entities?.items ?? []).map((e) => <option key={e.id} value={e.id}>{e.code}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <Label htmlFor="orgf-name">Nama</Label>
          <Input id="orgf-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="orgf-type">Tipe</Label>
          <select id="orgf-type" value={orgType} onChange={(e) => setOrgType(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            {['GROUP', 'LEGAL_ENTITY', 'BUSINESS_UNIT', 'DIVISION', 'REGION', 'BRANCH', 'DEPARTMENT', 'SECTION'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <Button onClick={() => { if (legalEntityId && name) create.mutate({ legalEntityId, name, orgType }, { onSuccess: () => setName('') }); }} loading={create.isPending}>
          Buat
        </Button>
      </div>
    </div>
  );
}

export function DoaForm() {
  const create = useCreateDoaRule();
  const [transactionType, setTransactionType] = useState('PurchaseOrder');
  const [approverLevel, setApproverLevel] = useState('L2');
  const [amountFrom, setAmountFrom] = useState('');
  const [amountTo, setAmountTo] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [approverRoleCode, setApproverRoleCode] = useState('');
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="doaf-tx">Transaksi</Label>
          <select id="doaf-tx" value={transactionType} onChange={(e) => setTransactionType(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            {['PurchaseRequisition', 'PurchaseOrder', 'Journal', 'Payment', 'BudgetBaseline', 'Contract'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div><Label htmlFor="doaf-from">Dari</Label><Input id="doaf-from" type="number" value={amountFrom} onChange={(e) => setAmountFrom(e.target.value)} className="w-28" /></div>
        <div><Label htmlFor="doaf-to">Sampai</Label><Input id="doaf-to" type="number" value={amountTo} onChange={(e) => setAmountTo(e.target.value)} className="w-28" /></div>
        <div>
          <Label htmlFor="doaf-risk">Risiko</Label>
          <select id="doaf-risk" value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Semua</option>
            {['LOW', 'MEDIUM', 'HIGH'].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="doaf-lv">Level</Label>
          <select id="doaf-lv" value={approverLevel} onChange={(e) => setApproverLevel(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            {['L1', 'L2', 'L3', 'L4', 'L5', 'L6'].map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div><Label htmlFor="doaf-role">Role</Label><Input id="doaf-role" value={approverRoleCode} onChange={(e) => setApproverRoleCode(e.target.value)} placeholder="PROCUREMENT_MANAGER" /></div>
        <Button onClick={() => {
          if (transactionType) create.mutate({
            transactionType, approverLevel,
            amountFrom: amountFrom ? Number(amountFrom) : undefined,
            amountTo: amountTo ? Number(amountTo) : undefined,
            riskLevel: riskLevel || undefined,
            approverRoleCode: approverRoleCode || undefined,
          }, { onSuccess: () => { setAmountFrom(''); setAmountTo(''); setApproverRoleCode(''); } });
        }} loading={create.isPending}>Buat Rule</Button>
      </div>
    </div>
  );
}

export function ResolveForm() {
  const resolve = useResolveDoa();
  const [transactionType, setTransactionType] = useState('PurchaseOrder');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState<{ approverLevel: string; approverRoleCode: string | null } | null>(null);
  return (
    <div className="mt-2 flex items-end gap-3">
      <div>
        <Label htmlFor="doar-tx">Transaksi</Label>
        <select id="doar-tx" value={transactionType} onChange={(e) => setTransactionType(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
          {['PurchaseRequisition', 'PurchaseOrder', 'Journal', 'Payment', 'BudgetBaseline', 'Contract'].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div><Label htmlFor="doar-amt">Amount</Label><Input id="doar-amt" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-36" /></div>
      <Button onClick={() => {
        resolve.mutate({ transactionType, amount: amount ? Number(amount) : undefined }, {
          onSuccess: (data) => {
            const r = data as unknown as { resolved: { approverLevel: string; approverRoleCode: string | null } | null };
            setResult(r.resolved);
          },
        });
      }} loading={resolve.isPending}>Resolve</Button>
      {result && (
        <div className="flex items-center gap-2">
          <span className="text-caption text-neutral-500">Approver:</span>
          <Badge variant="success">{result.approverLevel}</Badge>
          {result.approverRoleCode && <span className="font-mono text-body-sm text-neutral-700">{result.approverRoleCode}</span>}
        </div>
      )}
    </div>
  );
}

export function CurrencyForm({ currencies }: { currencies: Array<{ id: string; code: string }> }) {
  const createCurrency = useCreateCurrency();
  const createRate = useCreateExchangeRate();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [fromCurrencyId, setFromCurrencyId] = useState('');
  const [toCurrencyId, setToCurrencyId] = useState('');
  const [rateType, setRateType] = useState('SPOT');
  const [rate, setRate] = useState('');
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div><Label htmlFor="cur-code">Kode</Label><Input id="cur-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="USD" className="w-24" /></div>
        <div className="flex-1"><Label htmlFor="cur-name">Nama</Label><Input id="cur-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <Button onClick={() => { if (code && name) createCurrency.mutate({ code: code.toUpperCase(), name }, { onSuccess: () => { setCode(''); setName(''); } }); }} loading={createCurrency.isPending}>
          Buat Mata Uang
        </Button>
      </div>
      <div className="mt-4 flex items-end gap-3 border-t border-neutral-100 pt-4">
        <div>
          <Label htmlFor="rate-from">Dari</Label>
          <select id="rate-from" value={fromCurrencyId} onChange={(e) => setFromCurrencyId(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Pilih…</option>
            {currencies.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="rate-to">Ke</Label>
          <select id="rate-to" value={toCurrencyId} onChange={(e) => setToCurrencyId(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Pilih…</option>
            {currencies.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="rate-type">Tipe</Label>
          <select id="rate-type" value={rateType} onChange={(e) => setRateType(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            {['SPOT', 'MONTHLY', 'PERIOD_END'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div><Label htmlFor="rate-val">Rate</Label><Input id="rate-val" type="number" step="0.000001" value={rate} onChange={(e) => setRate(e.target.value)} className="w-32" /></div>
        <Button onClick={() => { if (fromCurrencyId && toCurrencyId && rate) createRate.mutate({ fromCurrencyId, toCurrencyId, rateType, rate: Number(rate) }, { onSuccess: () => setRate('') }); }} loading={createRate.isPending}>
          Catat Kurs
        </Button>
      </div>
    </div>
  );
}

export { formatNumber };
