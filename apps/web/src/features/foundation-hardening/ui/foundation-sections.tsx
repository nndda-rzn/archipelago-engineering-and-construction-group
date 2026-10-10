import { useState } from 'react';
import { DataGrid, EmptyCell, EmptyState, EntitySelect, ErrorState, Input, Label, SegmentedControl, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton, StatusBadge } from '@aec/ui';
import type { ColumnDef } from '@tanstack/react-table';
import type { DoaAnalysis, OrganizationNode } from '@aec/api-contracts';
import { OrgForm } from './org-form';
import { OrgOutline } from './org-outline';
import { OrgTimeline } from './org-timeline';
import { DoaLadder } from './doa-ladder';
import { DoaAnalysisPanel } from './doa-analysis';

export type DoaRuleItem = { id: string; transactionType: string; amountFrom?: number | null; amountTo?: number | null; riskLevel?: string | null; approverLevel: string; approverRoleCode?: string | null; status: string };
export type CurrencyItem = { id: string; code: string; name: string; isActive: boolean };
export type ExchangeRateItem = { id: string; fromCurrency?: { code?: string } | null; toCurrency?: { code?: string } | null; rateType: string; rate: number };

/** Ratakan pohon untuk opsi pemilih parent. */
function flatten(nodes: OrganizationNode[]): OrganizationNode[] {
  return nodes.flatMap((n) => [n, ...flatten(n.children)]);
}

export function DoaRulesTable({ rules }: { rules: DoaRuleItem[] }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white shadow-xs overflow-x-auto">
      <table className="w-full text-left text-body">
        <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500"><tr><th className="px-4 py-2">Transaction</th><th className="px-4 py-2 text-right">From</th><th className="px-4 py-2 text-right">To</th><th className="px-4 py-2">Risk</th><th className="px-4 py-2">Level</th><th className="px-4 py-2">Role</th></tr></thead>
        <tbody>{rules.map((r) => <tr key={r.id} className="border-t border-neutral-100 hover:bg-neutral-50"><td className="px-4 py-2 font-mono text-neutral-800">{r.transactionType}</td><td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-700">{r.amountFrom != null ? r.amountFrom.toLocaleString('id-ID') : <EmptyCell />}</td><td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-700">{r.amountTo != null ? r.amountTo.toLocaleString('id-ID') : <EmptyCell />}</td><td className="px-4 py-2">{r.riskLevel ? <span className="rounded-sm bg-neutral-100 px-1.5 py-0.5 text-caption">{r.riskLevel}</span> : <EmptyCell />}</td><td className="px-4 py-2"><span className="rounded-sm bg-info-50 px-1.5 py-0.5 text-caption text-info-700">{r.approverLevel}</span></td><td className="px-4 py-2 font-mono text-neutral-600">{r.approverRoleCode ?? <EmptyCell />}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

export const CurrencyGrid: ColumnDef<CurrencyItem, unknown>[] = [
  { id: 'code', header: 'Code', accessorKey: 'code', cell: (i) => <span className="font-mono text-neutral-800">{String(i.getValue())}</span> },
  { id: 'name', header: 'Name', accessorKey: 'name', cell: (i) => <span className="text-neutral-700">{String(i.getValue())}</span> },
  { id: 'type', header: 'Type', accessorKey: 'isActive', cell: (i) => <span className={i.getValue() ? 'text-success-700' : 'text-neutral-500'}>{i.getValue() ? 'ACTIVE' : 'INACTIVE'}</span> },
];

export function RatesTable({ rates }: { rates: ExchangeRateItem[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-body">
        <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500"><tr><th className="px-4 py-2">From</th><th className="px-4 py-2">To</th><th className="px-4 py-2">Type</th><th className="px-4 py-2 text-right">Rate</th></tr></thead>
        <tbody>{rates.map((r) => <tr key={r.id} className="border-t border-neutral-100 hover:bg-neutral-50"><td className="px-4 py-2 font-mono text-neutral-800">{r.fromCurrency?.code ?? <EmptyCell />}</td><td className="px-4 py-2 font-mono text-neutral-700">{r.toCurrency?.code ?? <EmptyCell />}</td><td className="px-4 py-2 text-caption text-neutral-600">{r.rateType}</td><td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-800">{r.rate}</td></tr>)}{rates.length === 0 && <tr><td colSpan={4} className="px-4 py-4 text-caption text-neutral-500">No exchange rates yet.</td></tr>}</tbody>
      </table>
    </div>
  );
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

export function CurrencyRateSection({ currencies, rates }: { currencies: CurrencyItem[]; rates: { isLoading: boolean; data: ExchangeRateItem[] | null } }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <div className="rounded-md border border-neutral-200 bg-white shadow-xs"><div className="border-b border-neutral-200 px-4 py-2 text-h3 text-neutral-800">Currency</div><DataGrid columns={CurrencyGrid} data={currencies} emptyMessage="No currencies yet" hideToolbar /></div>
      <div className="rounded-md border border-neutral-200 bg-white shadow-xs"><div className="border-b border-neutral-200 px-4 py-2 text-h3 text-neutral-800">Exchange Rates</div>{rates.isLoading ? <p className="p-4 text-body-sm text-neutral-500">Loading exchange rates…</p> : rates.data && <RatesTable rates={rates.data} />}</div>
    </div>
  );
}

