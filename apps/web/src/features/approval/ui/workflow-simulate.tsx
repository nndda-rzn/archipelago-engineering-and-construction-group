import { useState } from 'react';
import { Input, Label, cn } from '@aec/ui';
import type { WorkflowStep } from '@aec/api-contracts';
import { formatIdr } from '@/shared/lib/format';
import { conditionFieldLabel, opLabel } from './workflow-labels';

/**
 * Simulasi rantai: masukkan nominal dokumen, lihat langkah mana yang benar-benar
 * berlaku. Memakai aturan yang sama dengan server (`>` / `>=` / `<` / `<=` / `==`
 * terhadap nilai dokumen) — jadi jawabannya bukan tebakan UI.
 */
export function WorkflowSimulate({ steps, transactionType }: { steps: WorkflowStep[]; transactionType: string }) {
  const [amount, setAmount] = useState<string>('');

  const numeric = amount === '' ? null : Number(amount);

  const evaluate = (step: WorkflowStep): boolean => {
    if (!step.conditionField || !step.conditionOp || step.conditionValue == null || numeric == null) return true;
    const threshold = step.conditionValue;
    switch (step.conditionOp) {
      case '>': return numeric > threshold;
      case '<': return numeric < threshold;
      case '>=': return numeric >= threshold;
      case '<=': return numeric <= threshold;
      case '==': return numeric === threshold;
      default: return true;
    }
  };

  const applicable = numeric == null ? [] : steps.filter(evaluate);

  return (
    <div className="space-y-3">
      <div className="max-w-xs">
        <Label htmlFor="wf-simulate-amount">Document amount (IDR)</Label>
        <Input
          id="wf-simulate-amount"
          type="number"
          min={0}
          inputMode="numeric"
          placeholder="e.g. 3000000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="font-mono tabular-nums"
        />
      </div>

      {numeric == null ? (
        <p className="text-body-sm text-neutral-500">Enter an amount to see which steps apply.</p>
      ) : steps.length === 0 ? (
        <p className="text-body-sm text-neutral-500">This workflow has no steps yet.</p>
      ) : (
        <>
          <p className="text-body-sm text-neutral-700" role="status">
            A {transactionType === 'PurchaseOrder' ? 'purchase order' : 'purchase requisition'} worth{' '}
            <span className="font-mono tabular-nums">{formatIdr(numeric)}</span> needs{' '}
            <span className="font-mono tabular-nums">{applicable.length}</span> approval
            {applicable.length === 1 ? '' : 's'}.
          </p>
          <ul className="space-y-1.5">
            {steps.map((step) => {
              const applies = evaluate(step);
              return (
                <li key={step.id} className="flex items-center gap-3 text-body-sm">
                  <span className={cn('w-14 shrink-0 font-mono text-caption tabular-nums', applies ? 'text-neutral-800' : 'text-neutral-400')}>
                    Step {step.stepOrder}
                  </span>
                  <span className={cn('min-w-0 flex-1 truncate', applies ? 'text-neutral-800' : 'text-neutral-400 line-through')}>
                    {step.name}
                  </span>
                  <span className="shrink-0 text-caption text-neutral-500">
                    {applies ? 'applies' : 'skipped'}
                    {step.conditionField ? ` · ${conditionFieldLabel(step.conditionField)} ${opLabel(step.conditionOp)} ${formatIdr(step.conditionValue ?? 0)}` : ''}
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
