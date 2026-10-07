import type { WorkflowStep } from '@aec/api-contracts';
import { formatIdr } from '@/shared/lib/format';
import { CONDITION_FIELD_LABELS, opLabel } from '../ui/workflow-labels';

/** Nama dokumen manusiawi untuk anchor awal dan akhir rantai. */
export function subjectOf(transactionType: string): string {
  return transactionType === 'PurchaseOrder' ? 'Purchase order' : 'Purchase requisition';
}

/** Ringkas syarat langkah, mis. `Estimated total > 5.000.000` atau `A and B`. */
export function chainConditionText(step: WorkflowStep): string | null {
  if (step.conditionGroup) {
    return step.conditionGroup.conditions
      .map((c) => `${CONDITION_FIELD_LABELS[c.field] ?? c.field} ${opLabel(c.op)} ${formatIdr(c.value)}`)
      .join(step.conditionGroup.combinator === 'OR' ? ' or ' : ' and ');
  }
  if (!step.conditionField) return null;
  const field = CONDITION_FIELD_LABELS[step.conditionField] ?? step.conditionField;
  return `${field} ${opLabel(step.conditionOp)} ${formatIdr(step.conditionValue ?? 0)}`;
}

/** Nama tunggal ditulis utuh; banyak nama diringkas jadi jumlah (menyebut satu menyesatkan). */
export function summariseHolderNames(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0]!;
  if (names.length <= 3) return names.join(', ');
  return `${names.length} people`;
}
