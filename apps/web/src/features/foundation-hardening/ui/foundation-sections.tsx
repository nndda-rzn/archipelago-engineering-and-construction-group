import { useState } from 'react';
import { EmptyCell, EmptyState, EntitySelect, ErrorState, Input, Label, SegmentedControl, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton, StatusBadge } from '@aec/ui';
import type { Currency, DoaAnalysis, ExchangeRate, OrganizationNode } from '@aec/api-contracts';
import { OrgForm } from './org-form';
import { OrgOutline } from './org-outline';
import { OrgTimeline } from './org-timeline';
import { DoaLadder } from './doa-ladder';
import { DoaAnalysisPanel } from './doa-analysis';
import { CurrencyRegister } from './currency-register';
import { RateMatrixPanel } from './rate-matrix-panel';
import { RateHistoryView } from './rate-history';
import { RevaluePanel } from './revalue-panel';
import { useRateHistory } from '../model/foundation-hardening.api';

export type DoaRuleItem = { id: string; transactionType: string; amountFrom?: number | null; amountTo?: number | null; riskLevel?: string | null; approverLevel: string; approverRoleCode?: string | null; status: string };
export type CurrencyItem = { id: string; code: string; name: string; isActive: boolean };
export type ExchangeRateItem = { id: string; fromCurrency?: { code?: string } | null; toCurrency?: { code?: string } | null; rateType: string; rate: number };

/** Ratakan pohon untuk opsi pemilih parent. */
function flatten(nodes: OrganizationNode[]): OrganizationNode[] {
  return nodes.flatMap((n) => [n, ...flatten(n.children)]);
}

export function OrgSection({
  entityId,
  setEntityId,
  asOf,
  setAsOf,
  entities,
  orgs,
}: {
  entityId: string;
  setEntityId: (v: string) => void;
  asOf: string;
  setAsOf: (v: string) => void;
  entities: Array<{ id: string; code: string }>;
  orgs: { isLoading: boolean; isError?: boolean; onRetry?: () => void; data: OrganizationNode[] | null };
}) {
  const [view, setView] = useState<'structure' | 'timeline'>('structure');
  const [editing, setEditing] = useState<OrganizationNode | null>(null);
  const flat = orgs.data ? flatten(orgs.data) : [];
  const parentOptions = flat.map((n) => ({ id: n.item.id, name: n.item.name }));

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-72">
            <Label htmlFor="foundation-entity">Legal Entity</Label>
            <EntitySelect id="foundation-entity" value={entityId} onValueChange={setEntityId} options={entities.map((e) => ({ value: e.id, label: e.code }))} placeholder="Select entity…" searchPlaceholder="Search entity…" />
          </div>
          <div>
            <Label htmlFor="org-asof">As of</Label>
            <Input id="org-asof" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
          </div>
          <div className="ml-auto">
            <SegmentedControl aria-label="Organization view" value={view} onValueChange={(v) => setView(v as 'structure' | 'timeline')} options={[{ value: 'structure', label: 'Structure' }, { value: 'timeline', label: 'Timeline' }]} />
          </div>
        </div>
      </div>

      {!entityId ? (
        <p className="text-body-sm text-neutral-500">Select a legal entity to see its organization structure.</p>
      ) : editing ? (
        <OrgForm editing={editing.item} parentOptions={parentOptions} onDone={() => setEditing(null)} />
      ) : (
        <OrgForm parentOptions={parentOptions} />
      )}

      {entityId && (
        <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
          {orgs.isLoading ? (
            <div aria-label="Loading org structure" className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : orgs.isError ? (
            <div role="alert"><ErrorState message="The organization structure could not be loaded." onRetry={() => orgs.onRetry?.()} /></div>
          ) : !orgs.data || orgs.data.length === 0 ? (
            <EmptyState title="No organization units yet" description="Add the first unit to build the structure." />
          ) : view === 'structure' ? (
            <OrgOutline nodes={orgs.data} onEdit={(n) => setEditing(n)} />
          ) : (
            <OrgTimeline nodes={orgs.data} asOf={asOf} onAsOfChange={setAsOf} />
          )}
        </div>
      )}
    </div>
  );
}

export function DoaSection({
  transactionType,
  setTransactionType,
  rules,
  analysis,
  resolvedMarker,
  onEditRule,
  onToggleStatus,
}: {
  transactionType: string;
  setTransactionType: (v: string) => void;
  rules: { isLoading: boolean; isError?: boolean; onRetry?: () => void; data: DoaRuleItem[] | null };
  analysis: { isLoading: boolean; data: DoaAnalysis | undefined };
  resolvedMarker: number | null;
  onEditRule?: (rule: DoaRuleItem) => void;
  onToggleStatus?: (rule: DoaRuleItem) => void;
}) {
  const TX = ['PurchaseRequisition', 'PurchaseOrder', 'Journal', 'Payment', 'BudgetBaseline', 'Contract'];
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-64">
            <Label htmlFor="doa-tx-select">Transaction type</Label>
            <Select value={transactionType} onValueChange={setTransactionType}>
              <SelectTrigger id="doa-tx-select"><SelectValue /></SelectTrigger>
              <SelectContent>{TX.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4">
          {rules.isLoading || analysis.isLoading ? (
            <div aria-label="Loading authority ladder" className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : rules.isError ? (
            <div role="alert"><ErrorState message="The DoA rules could not be loaded." onRetry={() => rules.onRetry?.()} /></div>
          ) : (
            <DoaLadder transactionType={transactionType} rules={(rules.data ?? []) as never} overlaps={analysis.data?.overlaps ?? []} resolvedMarker={resolvedMarker} />
          )}
        </div>
      </div>

      <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
        <h3 className="mb-2 text-h3 text-neutral-950">Coverage analysis</h3>
        <DoaAnalysisPanel analysis={analysis.data} />
      </div>

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        {rules.data && rules.data.length > 0 ? (
          <table className="w-full text-left text-body">
            <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
              <tr><th className="px-4 py-2">Transaction</th><th className="px-4 py-2 text-right">From</th><th className="px-4 py-2 text-right">To</th><th className="px-4 py-2">Level</th><th className="px-4 py-2">Status</th><th className="px-4 py-2"></th></tr>
            </thead>
            <tbody>
              {rules.data.map((r) => (
                <tr key={r.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                  <td className="px-4 py-2 font-mono text-neutral-800">{r.transactionType}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-700">{r.amountFrom != null ? r.amountFrom.toLocaleString('id-ID') : <EmptyCell />}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-700">{r.amountTo != null ? r.amountTo.toLocaleString('id-ID') : '∞'}</td>
                  <td className="px-4 py-2"><span className="rounded-sm bg-info-50 px-1.5 py-0.5 text-caption text-info-700">{r.approverLevel}</span></td>
                  <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-2 text-right">
                    {onEditRule && <button type="button" onClick={() => onEditRule(r)} className="rounded px-1.5 py-0.5 text-caption text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800">Edit</button>}
                    {onToggleStatus && (
                      <button type="button" onClick={() => onToggleStatus(r)} className="ml-1 rounded px-1.5 py-0.5 text-caption text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800">
                        {r.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="p-4 text-body-sm text-neutral-500">No DoA rules yet.</p>
        )}
      </div>
    </div>
  );
}

export function CurrencyRateSection({
  currencies,
  rates,
}: {
  currencies: Currency[];
  rates: { isLoading: boolean; isError?: boolean; onRetry?: () => void; data: ExchangeRate[] | null };
}) {
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [rateType, setRateType] = useState('SPOT');
  const history = useRateHistory(fromId, toId, rateType);

  const rateList = rates.data ?? [];
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
        <h3 className="mb-2 text-h3 text-neutral-950">Currency register</h3>
        <CurrencyRegister currencies={currencies} />
      </div>

      <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
        <h3 className="mb-2 text-h3 text-neutral-950">Latest rates matrix</h3>
        {rates.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : rates.isError ? (
          <div role="alert"><ErrorState message="Exchange rates could not be loaded." onRetry={() => rates.onRetry?.()} /></div>
        ) : (
          <RateMatrixPanel rates={rateList} />
        )}
      </div>

      <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
        <h3 className="mb-2 text-h3 text-neutral-950">Rate history</h3>
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <div className="w-40">
            <Label htmlFor="hist-from">From</Label>
            <Select value={fromId} onValueChange={setFromId}>
              <SelectTrigger id="hist-from"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{currencies.map((c) => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="w-40">
            <Label htmlFor="hist-to">To</Label>
            <Select value={toId} onValueChange={setToId}>
              <SelectTrigger id="hist-to"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{currencies.map((c) => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="w-36">
            <Label htmlFor="hist-type">Type</Label>
            <Select value={rateType} onValueChange={setRateType}>
              <SelectTrigger id="hist-type"><SelectValue /></SelectTrigger>
              <SelectContent>{['SPOT', 'MONTHLY', 'PERIOD_END'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        {!fromId || !toId ? (
          <p className="text-body-sm text-neutral-500">Pick a currency pair to see its rate trend.</p>
        ) : history.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : history.isError || !history.data ? (
          <div role="alert"><ErrorState message="Rate history could not be loaded." onRetry={() => history.refetch()} /></div>
        ) : (
          <RateHistoryView data={history.data} />
        )}
      </div>

      <RevaluePanel currencies={currencies} />
    </div>
  );
}

