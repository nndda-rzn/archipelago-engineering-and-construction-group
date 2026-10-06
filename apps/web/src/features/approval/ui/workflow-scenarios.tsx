import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button, Input, cn } from '@aec/ui';
import type { WorkflowStep } from '@aec/api-contracts';
import { formatIdr, formatNumber } from '@/shared/lib/format';
import { applicableStepOrders, evaluateStep } from '../lib/evaluate-step';
import { conditionFieldLabel, opLabel } from './workflow-labels';

export interface Scenario {
  id: string;
  amount: number;
}

export interface WorkflowScenariosProps {
  steps: WorkflowStep[];
  transactionType: string;
  /** Jalur yang berlaku untuk skenario terpilih dikirim ke kanvas. */
  onPathChange?: (activeStepOrders: number[] | null) => void;
}

let seq = 0;
const nextId = () => `s${(seq += 1)}`;

/**
 * Simulasi multi-skenario.
 *
 * Satu nominal hanya menjawab satu pertanyaan. Pengguna sungguhan membandingkan
 * beberapa kasus sekaligus (mis. di bawah ambang, di sekitar ambang, jauh di atas
 * ambang) untuk memastikan rantai menyaring sebagaimana mestinya. Karena itu
 * beberapa nominal disimpan sebagai chip, dan memilih satu chip menyalakan
 * jalurnya di kanvas.
 *
 * Aturan evaluasi memakai `evaluateStep` — fungsi yang sama dengan server, jadi
 * jawabannya bukan tebakan UI. Perhitungan seluruhnya di klien; tidak ada
 * permintaan jaringan per skenario.
 */
export function WorkflowScenarios({ steps, transactionType, onPathChange }: WorkflowScenariosProps) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const selected = scenarios.find((s) => s.id === selectedId) ?? null;

  const applicable = (amount: number) => applicableStepOrders(steps, amount);

  const add = () => {
    const value = Number(draft);
    if (draft === '' || !Number.isFinite(value)) return;
    const scenario: Scenario = { id: nextId(), amount: value };
    setScenarios((prev) => [...prev, scenario]);
    setDraft('');
    select(scenario);
  };

  const select = (scenario: Scenario) => {
    setSelectedId(scenario.id);
    onPathChange?.(applicable(scenario.amount));
  };

  const remove = (id: string) => {
    setScenarios((prev) => prev.filter((s) => s.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      onPathChange?.(null);
    }
  };

  const clear = () => {
    setSelectedId(null);
    onPathChange?.(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {scenarios.map((scenario) => {
          const active = scenario.id === selectedId;
          const count = applicable(scenario.amount).length;
          return (
            <span
              key={scenario.id}
              className={cn(
                'inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-caption tabular-nums',
                active ? 'border-neutral-800 bg-neutral-800 text-white' : 'border-neutral-200 bg-white text-neutral-700',
              )}
            >
              <button
                type="button"
                onClick={() => select(scenario)}
                aria-pressed={active}
                aria-label={`Simulate ${formatIdr(scenario.amount)}: ${count} of ${steps.length} steps run`}
                className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
              >
                {formatNumber(scenario.amount)}
              </button>
              <button
                type="button"
                onClick={() => remove(scenario.id)}
                aria-label={`Remove scenario ${formatIdr(scenario.amount)}`}
                className={cn(
                  'rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400',
                  active ? 'text-neutral-300 hover:text-white' : 'text-neutral-400 hover:text-neutral-700',
                )}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          );
        })}
        {scenarios.length > 0 && (
          <Button size="sm" variant="ghost" onClick={clear}>
            Clear
          </Button>
        )}
      </div>

      <div className="flex items-end gap-2">
        <div className="max-w-[12rem] flex-1">
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="e.g. 3000000"
            value={draft}
            aria-label="Add a scenario amount (IDR)"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
            className="h-8 font-mono tabular-nums"
          />
        </div>
        <Button size="sm" variant="secondary" onClick={add} disabled={draft === ''}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add scenario
        </Button>
      </div>

      {steps.length === 0 ? (
        <p className="text-body-sm text-neutral-500">This workflow has no steps yet.</p>
      ) : !selected ? (
        <p className="text-body-sm text-neutral-500">
          Add an amount to see which steps run. The chain lights up the path for the selected scenario.
        </p>
      ) : (
        <>
          <p className="text-body-sm text-neutral-700" role="status">
            A {transactionType === 'PurchaseOrder' ? 'purchase order' : 'purchase requisition'} worth{' '}
            <span className="font-mono tabular-nums">{formatIdr(selected.amount)}</span> needs{' '}
            <span className="font-mono tabular-nums">{applicable(selected.amount).length}</span> of{' '}
            <span className="font-mono tabular-nums">{steps.length}</span> step
            {steps.length === 1 ? '' : 's'}.
          </p>
          <ul className="space-y-1">
            {steps.map((step) => {
              const applies = evaluateStep(step, selected.amount);
              return (
                <li key={step.id} className="flex items-center gap-3 text-body-sm">
                  <span
                    aria-hidden="true"
                    className={cn('h-2 w-2 shrink-0 rounded-full', applies ? 'bg-neutral-800' : 'border border-neutral-300 bg-white')}
                  />
                  <span className={cn('w-14 shrink-0 font-mono text-caption tabular-nums', applies ? 'text-neutral-800' : 'text-neutral-400')}>
                    Step {step.stepOrder}
                  </span>
                  <span className={cn('min-w-0 flex-1 truncate', applies ? 'text-neutral-800' : 'text-neutral-400')}>
                    {step.name}
                  </span>
                  <span className="shrink-0 text-caption text-neutral-500">
                    {applies ? 'runs' : 'skipped'}
                    {step.conditionField
                      ? `, ${conditionFieldLabel(step.conditionField)} ${opLabel(step.conditionOp)} ${formatIdr(step.conditionValue ?? 0)}`
                      : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
