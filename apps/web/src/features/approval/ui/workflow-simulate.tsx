import { useState } from 'react';
import { Input, Label, cn } from '@aec/ui';
import type { WorkflowStep } from '@aec/api-contracts';
import { formatIdr } from '@/shared/lib/format';
import { conditionFieldLabel, opLabel } from './workflow-labels';

/** Aturan yang sama dipakai server (`condition-evaluator`). */
export function evaluateStep(step: WorkflowStep, amount: number | null): boolean {
  if (!step.conditionField || !step.conditionOp || step.conditionValue == null || amount == null) return true;
  const threshold = step.conditionValue;
  switch (step.conditionOp) {
    case '>': return amount > threshold;
    case '<': return amount < threshold;
    case '>=': return amount >= threshold;
    case '<=': return amount <= threshold;
    case '==': return amount === threshold;
    default: return true;
  }
}

export interface WorkflowSimulateProps {
  steps: WorkflowStep[];
  transactionType: string;
  /**
   * Dipanggil setiap kali jalur berubah. Rantai memakai ini untuk menyalakan
   * langkah yang berlaku dan meredupkan yang dilewati, sehingga jawaban simulasi
   * terlihat **pada rantainya**, bukan sebagai daftar terpisah.
   * `null` berarti belum disimulasikan.
   */
  onPathChange?: (activeStepOrders: number[] | null) => void;
}

/**
 * Simulasi rantai. Memakai aturan yang sama dengan server, jadi jawabannya bukan
 * tebakan UI. Hasilnya dikirim ke rantai lewat `onPathChange`.
 */
export function WorkflowSimulate({ steps, transactionType, onPathChange }: WorkflowSimulateProps) {
  const [amount, setAmount] = useState<string>('');

  const numeric = amount === '' ? null : Number(amount);
  const applicable = numeric == null ? null : steps.filter((s) => evaluateStep(s, numeric)).map((s) => s.stepOrder);

  const update = (next: string) => {
    setAmount(next);
    const value = next === '' ? null : Number(next);
    onPathChange?.(value == null ? null : steps.filter((s) => evaluateStep(s, value)).map((s) => s.stepOrder));
  };

  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <Label htmlFor="wf-simulate-amount">Document amount (IDR)</Label>
        <Input
          id="wf-simulate-amount"
          type="number"
          min={0}
          inputMode="numeric"
          placeholder="e.g. 3000000"
          value={amount}
          onChange={(e) => update(e.target.value)}
          className="font-mono tabular-nums"
        />
      </div>

      {numeric == null ? (
        <p className="text-body-sm text-neutral-500">
          Enter an amount to see which steps run. The chain on the left lights up the path.
        </p>
      ) : steps.length === 0 ? (
        <p className="text-body-sm text-neutral-500">This workflow has no steps yet.</p>
      ) : (
        <>
          <p className="text-body-sm text-neutral-700" role="status">
            A {transactionType === 'PurchaseOrder' ? 'purchase order' : 'purchase requisition'} worth{' '}
            <span className="font-mono tabular-nums">{formatIdr(numeric)}</span> needs{' '}
            <span className="font-mono tabular-nums">{applicable!.length}</span> of{' '}
            <span className="font-mono tabular-nums">{steps.length}</span> step
            {steps.length === 1 ? '' : 's'}.
          </p>

          <ul className="space-y-1">
            {steps.map((step) => {
              const applies = evaluateStep(step, numeric);
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
