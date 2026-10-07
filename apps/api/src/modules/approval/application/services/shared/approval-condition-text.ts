import { toConditionGroupLoose } from './condition-group-mapper';

/**
 * Teks syarat sebuah langkah yang bisa dibaca manusia, mis. `Estimated total > 5.000.000`
 * atau `A and B`. Grup menang bila ada (paling ekspresif); jika tidak jatuh ke kolom
 * tunggal lama. Mengembalikan `null` bila langkah tak punya syarat.
 *
 * Ini satu-satunya implementasi `conditionText` di modul approval — sebelumnya
 * disalin di `approval-task.service` dan `workflow-insights.service`, dengan versi
 * task yang tidak sadar grup (bug laten untuk langkah bergrup).
 */
export function approvalConditionText(step: {
  conditionField: string | null;
  conditionOp: string | null;
  conditionValue: unknown;
  conditionGroup?: unknown;
}): string | null {
  const group = toConditionGroupLoose(step.conditionGroup);
  if (group) {
    return group.conditions
      .map((c) => `${c.field} ${c.op === '==' ? '=' : c.op} ${Number(c.value).toLocaleString('id-ID')}`)
      .join(group.combinator === 'OR' ? ' or ' : ' and ');
  }
  if (!step.conditionField || !step.conditionOp || step.conditionValue == null) return null;
  const op = step.conditionOp === '==' ? '=' : step.conditionOp;
  return `${step.conditionField} ${op} ${Number(step.conditionValue).toLocaleString('id-ID')}`;
}
