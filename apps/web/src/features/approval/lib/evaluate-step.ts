import { evaluateCondition, evaluateConditionGroup, type WorkflowStep } from '@aec/api-contracts';

/**
 * Apakah sebuah langkah berlaku untuk nominal dokumen tertentu.
 *
 * Fungsi diambil dari kontrak (`@aec/api-contracts`) supaya UI dan server benar-
 * benar memakai satu implementasi — dua salinan yang "seharusnya sama" adalah bug
 * yang menunggu waktu untuk muncul.
 *
 * Grup majemuk menang bila ada; kolom tunggal dipakai bila tidak. Langkah tanpa
 * syarat selalu berlaku.
 */
export function evaluateStep(step: WorkflowStep, amount: number | null): boolean {
  if (step.conditionGroup) return evaluateConditionGroup(step.conditionGroup, amount);
  if (!step.conditionField || !step.conditionOp || step.conditionValue == null || amount == null) return true;
  return evaluateCondition({ op: step.conditionOp, value: step.conditionValue }, amount);
}

/** Semua stepOrder yang berlaku untuk sebuah nominal. */
export function applicableStepOrders(steps: WorkflowStep[], amount: number | null): number[] {
  return steps.filter((s) => evaluateStep(s, amount)).map((s) => s.stepOrder);
}
