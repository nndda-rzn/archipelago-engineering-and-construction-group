import { useState } from 'react';
import { Button, Input } from '@aec/ui';
import type { BudgetSummary, CostTypeKey } from '@aec/api-contracts';

type Node = BudgetSummary['wbs'][number];

const COST_LABEL: Record<string, string> = {
  DIRECT: 'Direct',
  LABOR: 'Labor',
  MATERIAL: 'Material',
  SUBCONTRACTOR: 'Subcontractor',
  EQUIPMENT: 'Equipment',
  INDIRECT: 'Indirect',
  OVERHEAD: 'Overhead',
};

function money(n: number): string {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n);
}

/**
 * Panel detail satu simpul WBS: rincian per cost type, PV, dan form edit.
 *
 * Form mengirim `costType` bersama nominalnya. Tanpa itu, `BudgetService` dulu
 * jatuh ke 'DIRECT' dan menambah baris kelima di samping empat cost type nyata.
 */
export function BudgetInspector({
  node,
  onSave,
  saving,
  published,
}: {
  node: Node | null;
  onSave: (costType: CostTypeKey, amount: number) => void;
  saving: boolean;
  published: boolean;
}) {
  // Form memakai `key` dari pemanggil sehingga state-nya di-reset saat simpul
  // berganti. Menyinkronkan lewat effect akan memicu cascading render (dan
  // dilarang lint `react-hooks/set-state-in-effect`), jadi nilai awal diturunkan
  // sekali saat mount untuk simpul itu.
  const initialCostType = (Object.keys(node?.byCostType ?? {})[0] ?? 'LABOR') as CostTypeKey;
  const [costType, setCostType] = useState<CostTypeKey>(initialCostType);
  const [amount, setAmount] = useState(() => {
    const current = node?.byCostType[initialCostType];
    return current != null && current > 0 ? String(current) : '';
  });

  if (!node) {
    return (
      <aside aria-label="Budget detail" className="rounded-md border border-neutral-200 bg-surface-raised p-4">
        <p className="text-body-sm text-neutral-500">Select a WBS node to see its cost breakdown.</p>
      </aside>
    );
  }

  const entries = Object.entries(node.byCostType) as Array<[string, number]>;
  const available = entries.length > 0 ? entries.map(([k]) => k as CostTypeKey) : (['LABOR', 'MATERIAL', 'SUBCONTRACTOR', 'EQUIPMENT'] as CostTypeKey[]);

  return (
    <aside aria-label="Budget detail" className="flex flex-col gap-4 rounded-md border border-neutral-200 bg-surface-raised p-4">
      <header>
        <p className="font-mono text-caption text-neutral-500">{node.code}</p>
        <h2 className="mt-0.5 text-h3 text-neutral-950">{node.name}</h2>
      </header>

      <section aria-label="Cost breakdown">
        <h3 className="text-overline uppercase text-neutral-500">Cost type</h3>
        <dl className="mt-1 divide-y divide-neutral-100">
          {entries.length === 0 ? (
            <p className="py-1 text-body-sm text-neutral-500">No budget allocated yet.</p>
          ) : (
            entries
              .sort((a, b) => b[1] - a[1])
              .map(([key, value]) => (
                <div key={key} className="flex items-center justify-between py-1">
                  <dt className="text-body-sm text-neutral-700">{COST_LABEL[key] ?? key}</dt>
                  <dd className="font-mono text-body-sm tabular-nums text-neutral-900">{money(value)}</dd>
                </div>
              ))
          )}
        </dl>
      </section>

      <section aria-label="Totals" className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-neutral-100 pt-2 text-body-sm">
        <span className="text-neutral-500">Budget</span>
        <span className="text-right font-mono tabular-nums text-neutral-900">{money(node.budget)}</span>
        <span className="text-neutral-500">Used</span>
        <span className="text-right font-mono tabular-nums text-neutral-900">{money(node.used)}</span>
        <span className="text-neutral-500">Remaining</span>
        <span className={`text-right font-mono tabular-nums ${node.remaining < 0 ? 'text-destructive-600' : 'text-neutral-900'}`}>
          {money(node.remaining)}
        </span>
        <span className="text-neutral-500">Planned value</span>
        <span className="text-right font-mono tabular-nums text-neutral-700">{money(node.plannedValue)}</span>
      </section>

      {published ? (
        <p className="border-t border-neutral-100 pt-2 text-caption text-neutral-500">
          Budget is published. Editing requires a new version.
        </p>
      ) : (
        <section aria-label="Edit budget" className="flex flex-col gap-2 border-t border-neutral-100 pt-3">
          <label className="text-body-sm font-medium text-neutral-700" htmlFor="budget-cost-type">Cost type</label>
          <select
            id="budget-cost-type"
            value={costType}
            onChange={(e) => {
              const next = e.target.value as CostTypeKey;
              setCostType(next);
              const current = node.byCostType[next];
              setAmount(current != null && current > 0 ? String(current) : '');
            }}
            className="h-8 rounded-md border border-neutral-300 bg-white px-2 text-body-sm text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-800"
          >
            {available.map((k) => (
              <option key={k} value={k}>{COST_LABEL[k] ?? k}</option>
            ))}
          </select>
          <label className="text-body-sm font-medium text-neutral-700" htmlFor="budget-amount">
            {COST_LABEL[costType] ?? costType} amount
          </label>
          <Input
            id="budget-amount"
            type="number"
            inputMode="numeric"
            min={0}
            value={amount}
            placeholder="0"
            onChange={(e) => setAmount(e.target.value)}
            className="h-8 font-mono text-body-sm"
          />
          <Button
            size="sm"
            variant="secondary"
            disabled={saving}
            onClick={() => {
              const parsed = Number(amount);
              if (Number.isFinite(parsed) && parsed >= 0) onSave(costType, parsed);
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </section>
      )}
    </aside>
  );
}
