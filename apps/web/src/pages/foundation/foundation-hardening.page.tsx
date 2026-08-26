import { useState } from 'react';
import { Badge, Button, DataGrid, Input, Label } from '@aec/ui';
import {
  useCreateCurrency, useCreateDoaRule, useCreateExchangeRate, useCreateOrganization, useCurrencies,
  useDoaRules, useExchangeRates, useIfc, useOrganizations, useResolveDoa,
} from '@/features/foundation-hardening';
import { useLegalEntities } from '@/entities/legal-entity';
import { useProjects } from '@/entities/project';
import { formatNumber } from '@/shared/lib/format';

type Tab = 'org' | 'doa' | 'currency';

export function FoundationHardeningPage() {
  const [tab, setTab] = useState<Tab>('org');
  const [entityId, setEntityId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [asOf, setAsOf] = useState('');

  const entities = useLegalEntities({ page: 1, pageSize: 100 });
  const projects = useProjects({ page: 1, pageSize: 100 });
  const orgs = useOrganizations(entityId, asOf || undefined);
  const rules = useDoaRules();
  const currencies = useCurrencies();
  const rates = useExchangeRates();
  const ifc = useIfc(projectId);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-h1 text-neutral-950">Foundation Hardening</h1>
        <p className="mt-1 text-body-sm text-neutral-500">Effective-dated org, DoA engine, currency, IFC control, readiness gate (Fase 11F)</p>
      </div>

      <div className="mb-4 flex gap-2">
        {(['org', 'doa', 'currency'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-body-sm font-medium transition-colors ${
              tab === t ? 'bg-racing-red-600 text-white' : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300'
            }`}
          >
            {t === 'org' ? 'Organization' : t === 'doa' ? 'DoA Rules' : 'Currency & Rate'}
          </button>
        ))}
      </div>

      {tab === 'org' && (
        <div className="space-y-4">
          <OrgForm />
          <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
            <div className="flex items-end gap-3">
              <div className="w-72">
                <Label htmlFor="org-entity">Legal Entity</Label>
                <select id="org-entity" value={entityId} onChange={(e) => setEntityId(e.target.value)} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body text-neutral-900 hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20">
                  <option value="">Pilih…</option>
                  {(entities.data?.items ?? []).map((e) => <option key={e.id} value={e.id}>{e.code} — {e.legalName}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="org-asof">As-of (historis)</Label>
                <Input id="org-asof" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
            <h3 className="text-h3 text-neutral-900">Struktur Aktif ({orgs.data?.length ?? 0} node)</h3>
            <p className="text-caption text-neutral-500">FR-FND-002 — jawab struktur organisasi pada tanggal historis.</p>
            <div className="mt-3 space-y-1">
              {(orgs.data ?? []).map((o) => (
                <div key={o.id} className="flex items-center gap-3 border-t border-neutral-100 py-1.5">
                  <Badge variant="default">{o.orgType}</Badge>
                  <span className="text-neutral-800">{o.name}</span>
                  <span className="font-mono text-caption text-neutral-500">
                    {new Date(o.effectiveFrom).toLocaleDateString('id-ID')} → {o.effectiveTo ? new Date(o.effectiveTo).toLocaleDateString('id-ID') : 'sekarang'}
                  </span>
                </div>
              ))}
              {(orgs.data ?? []).length === 0 && <p className="text-caption text-neutral-500">Pilih entity untuk melihat struktur.</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'doa' && (
        <div className="space-y-4">
          <DoaForm />
          <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
            <h3 className="text-h3 text-neutral-900">Resolve Approver (FR-FND-006)</h3>
            <ResolveForm />
          </div>
          <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
            <table className="w-full text-left text-body">
              <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-2">Transaksi</th>
                  <th className="px-4 py-2">Amount Range</th>
                  <th className="px-4 py-2">Risiko</th>
                  <th className="px-4 py-2">Level</th>
                  <th className="px-4 py-2">Role</th>
                  <th className="px-4 py-2">Mode</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {(rules.data?.items ?? []).map((r) => (
                  <tr key={r.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                    <td className="px-4 py-2 font-mono text-neutral-700">{r.transactionType}</td>
                    <td className="px-4 py-2 font-mono text-neutral-600">
                      {r.amountFrom != null ? formatNumber(r.amountFrom) : '0'} — {r.amountTo != null ? formatNumber(r.amountTo) : '∞'}
                    </td>
                    <td className="px-4 py-2">{r.riskLevel ? <Badge variant={r.riskLevel === 'HIGH' ? 'warning' : 'default'}>{r.riskLevel}</Badge> : '—'}</td>
                    <td className="px-4 py-2 font-mono font-medium text-neutral-800">{r.approverLevel}</td>
                    <td className="px-4 py-2 text-neutral-600">{r.approverRoleCode ?? '—'}</td>
                    <td className="px-4 py-2 text-neutral-600">{r.approvalMode}</td>
                    <td className="px-4 py-2"><Badge variant={r.status === 'ACTIVE' ? 'success' : 'warning'}>{r.status}</Badge></td>
                  </tr>
                ))}
                {(rules.data?.items ?? []).length === 0 && <tr><td colSpan={7} className="px-4 py-4 text-caption text-neutral-500">Belum ada DoA rule.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'currency' && (
        <div className="space-y-4">
          <CurrencyForm currencies={currencies.data?.items ?? []} />
          <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
            <h3 className="text-h3 text-neutral-900">Mata Uang</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {(currencies.data?.items ?? []).map((c) => (
                <span key={c.id} className="inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-body-sm">
                  <Badge variant="default">{c.code}</Badge>
                  <span className="text-neutral-800">{c.name}</span>
                </span>
              ))}
              {(currencies.data?.items ?? []).length === 0 && <p className="text-caption text-neutral-500">Belum ada mata uang.</p>}
            </div>
          </div>
          <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
            <h3 className="text-h3 text-neutral-900">Kurs (historis)</h3>
            <table className="mt-2 w-full text-left text-body">
              <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-2">Dari</th>
                  <th className="px-4 py-2">Ke</th>
                  <th className="px-4 py-2 text-right">Rate</th>
                  <th className="px-4 py-2">Tipe</th>
                  <th className="px-4 py-2">Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {(rates.data?.items ?? []).map((r) => (
                  <tr key={r.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                    <td className="px-4 py-2 font-mono text-neutral-700">{r.fromCurrency.code}</td>
                    <td className="px-4 py-2 font-mono text-neutral-700">{r.toCurrency.code}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-800">{r.rate}</td>
                    <td className="px-4 py-2"><Badge variant="default">{r.rateType}</Badge></td>
                    <td className="px-4 py-2 font-mono text-neutral-600">{new Date(r.effectiveDate).toLocaleDateString('id-ID')}</td>
                  </tr>
                ))}
                {(rates.data?.items ?? []).length === 0 && <tr><td colSpan={5} className="px-4 py-4 text-caption text-neutral-500">Belum ada kurs.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
            <h3 className="text-h3 text-neutral-900">IFC Control (FR-ENG-006)</h3>
            <div className="mt-2 w-72">
              <Label htmlFor="ifc-project">Project</Label>
              <select id="ifc-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body text-neutral-900 hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20">
                <option value="">Pilih…</option>
                {(projects.data?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
              </select>
            </div>
            <div className="mt-3">
              {ifc.data && (
                <>
                  <p className="text-body-sm text-neutral-700">Current IFC tersedia: <span className="font-medium text-neutral-900">{ifc.data.total}</span> dokumen</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ifc.data.items.map((d) => (
                      <span key={d.id} className="inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-body-sm">
                        <Badge variant="success">IFC</Badge>
                        <span className="font-mono text-neutral-700">{d.drawingNumber}</span>
                        <span className="text-neutral-600">{d.title}</span>
                        <span className="font-mono text-caption text-neutral-500">rev {d.currentRevision}</span>
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrgForm() {
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

function DoaForm() {
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
        <div>
          <Label htmlFor="doaf-from">Dari</Label>
          <Input id="doaf-from" type="number" value={amountFrom} onChange={(e) => setAmountFrom(e.target.value)} className="w-28" />
        </div>
        <div>
          <Label htmlFor="doaf-to">Sampai</Label>
          <Input id="doaf-to" type="number" value={amountTo} onChange={(e) => setAmountTo(e.target.value)} className="w-28" />
        </div>
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
        <div>
          <Label htmlFor="doaf-role">Role</Label>
          <Input id="doaf-role" value={approverRoleCode} onChange={(e) => setApproverRoleCode(e.target.value)} placeholder="PROCUREMENT_MANAGER" />
        </div>
        <Button onClick={() => {
          if (transactionType) create.mutate({
            transactionType, approverLevel,
            amountFrom: amountFrom ? Number(amountFrom) : undefined,
            amountTo: amountTo ? Number(amountTo) : undefined,
            riskLevel: riskLevel || undefined,
            approverRoleCode: approverRoleCode || undefined,
          }, { onSuccess: () => { setAmountFrom(''); setAmountTo(''); setApproverRoleCode(''); } });
        }} loading={create.isPending}>
          Buat Rule
        </Button>
      </div>
    </div>
  );
}

function ResolveForm() {
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
      <div>
        <Label htmlFor="doar-amt">Amount</Label>
        <Input id="doar-amt" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-36" />
      </div>
      <Button onClick={() => {
        resolve.mutate({ transactionType, amount: amount ? Number(amount) : undefined }, {
          onSuccess: (data) => {
            const r = data as unknown as { resolved: { approverLevel: string; approverRoleCode: string | null } | null };
            setResult(r.resolved);
          },
        });
      }} loading={resolve.isPending}>
        Resolve
      </Button>
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

function CurrencyForm({ currencies }: { currencies: Array<{ id: string; code: string }> }) {
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
        <div>
          <Label htmlFor="cur-code">Kode</Label>
          <Input id="cur-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="USD" className="w-24" />
        </div>
        <div className="flex-1">
          <Label htmlFor="cur-name">Nama</Label>
          <Input id="cur-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
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
        <div>
          <Label htmlFor="rate-val">Rate</Label>
          <Input id="rate-val" type="number" step="0.000001" value={rate} onChange={(e) => setRate(e.target.value)} className="w-32" />
        </div>
        <Button onClick={() => { if (fromCurrencyId && toCurrencyId && rate) createRate.mutate({ fromCurrencyId, toCurrencyId, rateType, rate: Number(rate) }, { onSuccess: () => setRate('') }); }} loading={createRate.isPending}>
          Catat Kurs
        </Button>
      </div>
    </div>
  );
}
