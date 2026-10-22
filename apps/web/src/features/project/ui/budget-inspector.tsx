import { useState } from 'react';
import { Button, Input } from '@aec/ui';
import type { BudgetStatementRow, CostTypeKey } from '@aec/api-contracts';
import { formatIdr } from '@/shared/lib/format';

const COST_LABEL: Record<string, string> = {
  DIRECT: 'Direct',
  LABOR: 'Labor',
  MATERIAL: 'Material',
  SUBCONTRACTOR: 'Subcontractor',
  EQUIPMENT: 'Equipment',
  INDIRECT: 'Indirect',
  OVERHEAD: 'Overhead',
};

/**
 * Panel detail satu simpul WBS: rincian per cost type, nilai berjalan, dan form
 * edit. Dirender inline di bawah baris yang dipilih (bukan rail kanan).
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
  node: BudgetStatementRow | null;
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
      <aside aria-label="Budget detail" className="p-4">
        <p className="text-body-sm text-neutral-500">Select a WBS node to see its cost breakdown.</p>
      </aside>
    );
  }

  const entries = Object.entries(node.byCostType) as Array<[string, number]>;
  const available = entries.length > 0 ? entries.map(([k]) => k as CostTypeKey) : (['LABOR', 'MATERIAL', 'SUBCONTRACTOR', 'EQUIPMENT'] as CostTypeKey[]);

  return (
    <aside aria-label="Budget detail" className="grid gap-6 p-4 md:grid-cols-3">
      <section aria-label="Cost breakdown">
        <header>
          <p className="font-mono text-caption text-neutral-500">{node.code}</p>
          <h3 className="mt-0.5 text-h3 text-neutral-950">{node.name}</h3>
        </header>
        <h4 className="mt-3 text-overline uppercase text-neutral-500">Cost type</h4>
        <dl className="mt-1 divide-y divide-neutral-100">
          {entries.length === 0 ? (
            <p className="py-1 text-body-sm text-neutral-500">No budget allocated yet.</p>
          ) : (
            entries
              .sort((a, b) => b[1] - a[1])
              .map(([key, value]) => (
                <div key={key} className="flex items-center justify-between py-1">
                  <dt className="text-body-sm text-neutral-700">{COST_LABEL[key] ?? key}</dt>
                  <dd className="font-mono text-body-sm tabular-nums text-neutral-900" title={formatIdr(value)}>{formatIdr(value)}</dd>
                </div>
              ))
          )}
        </dl>
      </section>

      <section aria-label="Totals" className="text-body-sm">
        <h4 className="text-overline uppercase text-neutral-500">Position</h4>
        <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1">
          <dt className="text-neutral-500">Baseline</dt>
          <dd className="text-right font-mono tabular-nums text-neutral-900">{formatIdr(node.baseline)}</dd>
          <dt className="text-neutral-500">Revised</dt>
          <dd className="text-right font-mono tabular-nums text-neutral-900">{formatIdr(node.revised)}</dd>
          <dt className="text-neutral-500">Committed</dt>
          <dd className="text-right font-mono tabular-nums text-neutral-900">{formatIdr(node.committed)}</dd>
          <dt className="text-neutral-500">Actual</dt>
          <dd className="text-right font-mono tabular-nums text-neutral-900">{formatIdr(node.actual)}</dd>
          <dt className="text-neutral-500">Available</dt>
          <dd className={`text-right font-mono tabular-nums ${node.available < 0 ? 'text-destructive-700' : 'text-neutral-900'}`}>
            {formatIdr(node.available)}
          </dd>
          <dt className="text-neutral-500">Variance</dt>
          <dd className={`text-right font-mono tabular-nums ${node.variance < 0 ? 'text-destructive-700' : 'text-neutral-900'}`}>
            {formatIdr(node.variance)}
          </dd>
        </dl>
      </section>

      {published ? (
        <p className="text-caption text-neutral-500 md:self-end">
          No revision is open. Open a revision to change this budget.
        </p>
      ) : (
        <section aria-label="Edit budget" className="flex flex-col gap-2">
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
            className="h-8 rounded-md border border-neutral-300 bg-white px-2 text-body-sm text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-800"
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
