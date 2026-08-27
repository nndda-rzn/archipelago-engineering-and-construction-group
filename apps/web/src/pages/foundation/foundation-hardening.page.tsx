import { useState } from 'react';
import { Badge, DataGrid, Input, Label } from '@aec/ui';
import {
  useCurrencies, useDoaRules, useExchangeRates, useIfc, useOrganizations,
} from '@/features/foundation-hardening';
import { useLegalEntities } from '@/entities/legal-entity';
import { useProjects } from '@/entities/project';
import { formatNumber } from '@/shared/lib/format';
import { OrgForm, DoaForm, ResolveForm, CurrencyForm } from '@/features/foundation-hardening/ui';

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

  const currencyOptions = currencies.data?.items ?? [];

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
                <select id="org-entity" value={entityId} onChange={(e) => setEntityId(e.target.value)} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body">
                  <option value="">Pilih entity…</option>
                  {(entities.data?.items ?? []).map((e) => <option key={e.id} value={e.id}>{e.code}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="org-asof">As Of</Label>
                <Input id="org-asof" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
              </div>
            </div>
            {entityId && (
              <div className="mt-4">
                {orgs.isLoading && <p className="text-body-sm text-neutral-500">Memuat struktur org…</p>}
                {orgs.data && (
                  <table className="mt-2 w-full text-left text-body">
                    <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
                      <tr>
                        <th className="px-4 py-2">Unit</th>
                        <th className="px-4 py-2">Tipe</th>
                        <th className="px-4 py-2">Kode</th>
                        <th className="px-4 py-2">Level</th>
                        <th className="px-4 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Array.isArray(orgs.data) ? orgs.data : (orgs.data as { items?: unknown[] })?.items ?? []).map((org: unknown) => {
                        const o = org as { id: string; name: string; orgType: string; code?: string; level?: number; status: string };
                        return (
                          <tr key={o.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                            <td className="px-4 py-2 text-neutral-800">{o.name}</td>
                            <td className="px-4 py-2"><Badge variant="default">{o.orgType}</Badge></td>
                            <td className="px-4 py-2 font-mono text-neutral-600">{o.code ?? '-'}</td>
                            <td className="px-4 py-2 font-mono tabular-nums text-neutral-600">{o.level ?? '-'}</td>
                            <td className="px-4 py-2"><Badge variant={o.status === 'ACTIVE' ? 'success' : 'muted'}>{o.status}</Badge></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
            <h2 className="mb-3 text-h2 text-neutral-950">IFC Control</h2>
            <div className="flex items-end gap-3">
              <div className="w-72">
                <Label htmlFor="ifc-project">Project</Label>
                <select id="ifc-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body">
                  <option value="">Pilih project…</option>
                  {(projects.data?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
                </select>
              </div>
            </div>
            {projectId && ifc.data && (
              <div className="mt-3 flex gap-4 text-body-sm">
                <span>IFC total: <span className="font-mono font-medium">{formatNumber((ifc.data as { total?: number })?.total ?? 0)}</span></span>
                <span>Released: <span className="font-mono font-medium">{formatNumber((ifc.data as { released?: number })?.released ?? 0)}</span></span>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'doa' && (
        <div className="space-y-4">
          <DoaForm />
          <ResolveForm />
          <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
            {rules.isLoading && <p className="p-4 text-body-sm text-neutral-500">Memuat DoA rules…</p>}
            {rules.data && (
              <table className="w-full text-left text-body">
                <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-2">Transaksi</th>
                    <th className="px-4 py-2 text-right">Dari</th>
                    <th className="px-4 py-2 text-right">Sampai</th>
                    <th className="px-4 py-2">Risiko</th>
                    <th className="px-4 py-2">Level</th>
                    <th className="px-4 py-2">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {((Array.isArray(rules.data) ? rules.data : (rules.data as { items?: unknown[] })?.items ?? []) as Array<{ id: string; transactionType: string; amountFrom?: number | null; amountTo?: number | null; riskLevel?: string | null; approverLevel: string; approverRoleCode?: string | null }>).map((r) => (
                    <tr key={r.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                      <td className="px-4 py-2 font-mono text-neutral-800">{r.transactionType}</td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-700">{r.amountFrom != null ? formatNumber(r.amountFrom) : '-'}</td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-700">{r.amountTo != null ? formatNumber(r.amountTo) : '-'}</td>
                      <td className="px-4 py-2">{r.riskLevel ? <Badge variant="default">{r.riskLevel}</Badge> : '-'}</td>
                      <td className="px-4 py-2"><Badge variant="info">{r.approverLevel}</Badge></td>
                      <td className="px-4 py-2 font-mono text-neutral-600">{r.approverRoleCode ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'currency' && (
        <div className="space-y-4">
          <CurrencyForm currencies={currencyOptions} />
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
              <div className="border-b border-neutral-200 px-4 py-2 text-h3 text-neutral-800">Mata Uang</div>
              <DataGrid
                columns={[
                  { id: 'code', header: 'Kode', accessorKey: 'code', cell: (i: { getValue: () => unknown }) => <span className="font-mono text-neutral-800">{String(i.getValue())}</span> },
                  { id: 'name', header: 'Nama', accessorKey: 'name', cell: (i: { getValue: () => unknown }) => <span className="text-neutral-700">{String(i.getValue())}</span> },
                  { id: 'type', header: 'Tipe', accessorKey: 'currencyType', cell: (i: { getValue: () => unknown }) => <Badge variant="default">{String(i.getValue() ?? '-')}</Badge> },
                ]}
                data={currencyOptions}
                emptyMessage="Belum ada mata uang"
                hideToolbar
              />
            </div>
            <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
              <div className="border-b border-neutral-200 px-4 py-2 text-h3 text-neutral-800">Kurs</div>
              {rates.isLoading && <p className="p-4 text-body-sm text-neutral-500">Memuat kurs…</p>}
              {rates.data && (
                <table className="w-full text-left text-body">
                  <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
                    <tr>
                      <th className="px-4 py-2">Dari</th>
                      <th className="px-4 py-2">Ke</th>
                      <th className="px-4 py-2">Tipe</th>
                      <th className="px-4 py-2 text-right">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {((Array.isArray(rates.data) ? rates.data : (rates.data as { items?: unknown[] })?.items ?? []) as Array<{ id: string; fromCurrency?: { code?: string }; toCurrency?: { code?: string }; rateType: string; rate: number }>).map((r) => (
                      <tr key={r.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                        <td className="px-4 py-2 font-mono text-neutral-800">{r.fromCurrency?.code ?? '-'}</td>
                        <td className="px-4 py-2 font-mono text-neutral-700">{r.toCurrency?.code ?? '-'}</td>
                        <td className="px-4 py-2"><Badge variant="default">{r.rateType}</Badge></td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-800">{r.rate}</td>
                      </tr>
                    ))}
                    {((Array.isArray(rates.data) ? rates.data : (rates.data as { items?: unknown[] })?.items ?? [])).length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-4 text-caption text-neutral-500">Belum ada kurs.</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
