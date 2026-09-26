import { Badge, DataGrid, EmptyCell, EntitySelect, Input, Label } from '@aec/ui';
import type { ColumnDef } from '@tanstack/react-table';

export type OrganizationNode = { id: string; name: string; orgType: string; code?: string | null; level?: number | null; status: string };
export type DoaRuleItem = { id: string; transactionType: string; amountFrom?: number | null; amountTo?: number | null; riskLevel?: string | null; approverLevel: string; approverRoleCode?: string | null };
export type CurrencyItem = { id: string; code: string; name: string; isActive: boolean };
export type ExchangeRateItem = { id: string; fromCurrency?: { code?: string } | null; toCurrency?: { code?: string } | null; rateType: string; rate: number };
export type IfcSummary = { total: number; released: number };

export function OrgStructureTable({ nodes }: { nodes: OrganizationNode[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="mt-2 w-full text-left text-body">
        <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500"><tr><th className="px-4 py-2">Unit</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Code</th><th className="px-4 py-2">Level</th><th className="px-4 py-2">Status</th></tr></thead>
        <tbody>{nodes.map((o) => <tr key={o.id} className="border-t border-neutral-100 hover:bg-neutral-50"><td className="px-4 py-2 text-neutral-800">{o.name}</td><td className="px-4 py-2"><Badge variant="default">{o.orgType}</Badge></td><td className="px-4 py-2 font-mono text-neutral-600">{o.code ?? <EmptyCell />}</td><td className="px-4 py-2 font-mono tabular-nums text-neutral-600">{o.level ?? <EmptyCell />}</td><td className="px-4 py-2"><Badge variant={o.status === 'ACTIVE' ? 'success' : 'muted'}>{o.status}</Badge></td></tr>)}</tbody>
      </table>
    </div>
  );
}

export function DoaRulesTable({ rules }: { rules: DoaRuleItem[] }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white shadow-xs overflow-x-auto">
      <table className="w-full text-left text-body">
        <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500"><tr><th className="px-4 py-2">Transaction</th><th className="px-4 py-2 text-right">From</th><th className="px-4 py-2 text-right">To</th><th className="px-4 py-2">Risk</th><th className="px-4 py-2">Level</th><th className="px-4 py-2">Role</th></tr></thead>
        <tbody>{rules.map((r) => <tr key={r.id} className="border-t border-neutral-100 hover:bg-neutral-50"><td className="px-4 py-2 font-mono text-neutral-800">{r.transactionType}</td><td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-700">{r.amountFrom != null ? r.amountFrom.toLocaleString('id-ID') : <EmptyCell />}</td><td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-700">{r.amountTo != null ? r.amountTo.toLocaleString('id-ID') : <EmptyCell />}</td><td className="px-4 py-2">{r.riskLevel ? <Badge variant="default">{r.riskLevel}</Badge> : <EmptyCell />}</td><td className="px-4 py-2"><Badge variant="info">{r.approverLevel}</Badge></td><td className="px-4 py-2 font-mono text-neutral-600">{r.approverRoleCode ?? <EmptyCell />}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

export const CurrencyGrid: ColumnDef<CurrencyItem, unknown>[] = [
  { id: 'code', header: 'Code', accessorKey: 'code', cell: (i) => <span className="font-mono text-neutral-800">{String(i.getValue())}</span> },
  { id: 'name', header: 'Name', accessorKey: 'name', cell: (i) => <span className="text-neutral-700">{String(i.getValue())}</span> },
  { id: 'type', header: 'Type', accessorKey: 'isActive', cell: (i) => (i.getValue() ? <Badge variant="success">ACTIVE</Badge> : <Badge variant="default">INACTIVE</Badge>) },
];

export function RatesTable({ rates }: { rates: ExchangeRateItem[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-body">
        <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500"><tr><th className="px-4 py-2">From</th><th className="px-4 py-2">To</th><th className="px-4 py-2">Type</th><th className="px-4 py-2 text-right">Rate</th></tr></thead>
        <tbody>{rates.map((r) => <tr key={r.id} className="border-t border-neutral-100 hover:bg-neutral-50"><td className="px-4 py-2 font-mono text-neutral-800">{r.fromCurrency?.code ?? <EmptyCell />}</td><td className="px-4 py-2 font-mono text-neutral-700">{r.toCurrency?.code ?? <EmptyCell />}</td><td className="px-4 py-2"><Badge variant="default">{r.rateType}</Badge></td><td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-800">{r.rate}</td></tr>)}{rates.length === 0 && <tr><td colSpan={4} className="px-4 py-4 text-caption text-neutral-500">No exchange rates yet.</td></tr>}</tbody>
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
  orgs: { isLoading: boolean; data: OrganizationNode[] | null };
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
        <div className="flex items-end gap-3">
          <div className="w-72"><Label htmlFor="foundation-entity">Legal Entity</Label><EntitySelect id="foundation-entity" value={entityId} onValueChange={setEntityId} options={entities.map((e) => ({ value: e.id, label: e.code }))} placeholder="Select entity…" searchPlaceholder="Search entity…" /></div>
          <div><Label htmlFor="org-asof">As Of</Label><Input id="org-asof" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} /></div>
        </div>
        {entityId && <div className="mt-4">{orgs.isLoading ? <p className="text-body-sm text-neutral-500">Loading org structure…</p> : orgs.data && <OrgStructureTable nodes={orgs.data} />}</div>}
      </div>
    </div>
  );
}

export function IfcSection({
  projectId,
  setProjectId,
  projects,
  ifc,
}: {
  projectId: string;
  setProjectId: (v: string) => void;
  projects: Array<{ id: string; code: string }>;
  ifc: { data: IfcSummary | null };
}) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <h2 className="mb-3 text-h2 text-neutral-950">IFC Control</h2>
      <div className="w-72"><Label htmlFor="foundation-project">Project</Label><EntitySelect id="foundation-project" value={projectId} onValueChange={setProjectId} options={projects.map((p) => ({ value: p.id, label: p.code }))} placeholder="Select project…" searchPlaceholder="Search project…" /></div>
      {projectId && ifc.data && <div className="mt-3 flex gap-4 text-body-sm"><span>IFC total: <span className="font-mono font-medium">{ifc.data.total}</span></span><span>Released: <span className="font-mono font-medium">{ifc.data.released}</span></span></div>}
    </div>
  );
}

export function DoaSection({ rules }: { rules: { isLoading: boolean; data: DoaRuleItem[] | null } }) {
  return <div className="space-y-4">{rules.isLoading ? <p className="p-4 text-body-sm text-neutral-500">Loading DoA rules…</p> : rules.data && <DoaRulesTable rules={rules.data} />}</div>;
}

export function CurrencyRateSection({ currencies, rates }: { currencies: CurrencyItem[]; rates: { isLoading: boolean; data: ExchangeRateItem[] | null } }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <div className="rounded-md border border-neutral-200 bg-white shadow-xs"><div className="border-b border-neutral-200 px-4 py-2 text-h3 text-neutral-800">Currency</div><DataGrid columns={CurrencyGrid} data={currencies} emptyMessage="No currencies yet" hideToolbar /></div>
      <div className="rounded-md border border-neutral-200 bg-white shadow-xs"><div className="border-b border-neutral-200 px-4 py-2 text-h3 text-neutral-800">Exchange Rates</div>{rates.isLoading ? <p className="p-4 text-body-sm text-neutral-500">Loading exchange rates…</p> : rates.data && <RatesTable rates={rates.data} />}</div>
    </div>
  );
}
