import type { WorkflowStep } from '@aec/api-contracts';
import { conditionFieldLabel, opLabel } from '../ui/workflow-labels';

export type PreflightSeverity = 'blocker' | 'warning';

export interface PreflightIssue {
  /** `blocker` mencegah publish; `warning` hanya perlu ditinjau. */
  severity: PreflightSeverity;
  /** Kode stabil, dipakai untuk test dan untuk memetakan pesan. */
  code: string;
  message: string;
  /** Langkah yang bermasalah, bila ada — dipakai untuk melompat ke node-nya. */
  stepId?: string;
  stepOrder?: number;
}

export interface PreflightInput {
  steps: WorkflowStep[];
  /** Jumlah pemegang role per kode role. 0 berarti rantai macet. */
  holdersByRole: Record<string, number>;
  /** Nama role yang dikenal; dipakai mendeteksi role yang tidak ada. */
  knownRoleCodes?: string[];
}

/**
 * Pemeriksaan sebelum publish.
 *
 * Sumber masalah yang sebenarnya ada di server (`publishWorkflow`) sudah dipindah
 * ke depan: role tanpa pemegang, langkah kosong, dan syarat yang tidak lengkap.
 * Tujuannya bukan menggantikan validasi server — server tetap penentu akhir —
 * tetapi membuat pengguna melihat masalahnya **di tempat masalahnya berada**
 * (node langkah), bukan setelah menekan Publish lalu mendapat satu pesan umum.
 *
 * Fungsi ini murni: tidak menyentuh jaringan, mudah diuji.
 */
export function preflight(input: PreflightInput): PreflightIssue[] {
  const { steps, holdersByRole, knownRoleCodes } = input;
  const issues: PreflightIssue[] = [];

  if (steps.length === 0) {
    issues.push({
      severity: 'blocker',
      code: 'NO_STEPS',
      message: 'The workflow needs at least one step before it can be published.',
    });
    return issues;
  }

  const known = knownRoleCodes ? new Set(knownRoleCodes) : null;

  for (const step of steps) {
    const roleKnown = known ? known.has(step.approverRoleCode) : true;
    const holders = holdersByRole[step.approverRoleCode] ?? 0;

    if (!roleKnown) {
      issues.push({
        severity: 'blocker',
        code: 'ROLE_NOT_FOUND',
        message: `Step ${step.stepOrder} uses a role that does not exist (${step.approverRoleCode}).`,
        stepId: step.id,
        stepOrder: step.stepOrder,
      });
      continue;
    }

    if (holders === 0) {
      issues.push({
        severity: 'blocker',
        code: 'NO_HOLDER',
        message: `Step ${step.stepOrder} has no user holding its approver role, so the chain would stall.`,
        stepId: step.id,
        stepOrder: step.stepOrder,
      });
    }

    if (step.name.trim().length === 0) {
      issues.push({
        severity: 'blocker',
        code: 'EMPTY_NAME',
        message: `Step ${step.stepOrder} has no name.`,
        stepId: step.id,
        stepOrder: step.stepOrder,
      });
    }

    // Syarat sebagian terisi tidak pernah cocok dengan dokumen mana pun, sehingga
    // langkah tampak bersyarat tetapi selalu berlaku. Ini kegagalan senyap.
    const hasGroup = Boolean(step.conditionGroup && step.conditionGroup.conditions.length > 0);
    if (hasGroup) {
      // Grup adalah sumber kebenaran: nilai tidak positif tetap perlu ditinjau.
      for (const [index, condition] of step.conditionGroup!.conditions.entries()) {
        if (condition.value <= 0) {
          issues.push({
            severity: 'warning',
            code: 'NON_POSITIVE_THRESHOLD',
            message: `Step ${step.stepOrder} rule ${index + 1} triggers on ${conditionFieldLabel(condition.field)} ${opLabel(condition.op)} ${condition.value}, which is not a positive amount.`,
            stepId: step.id,
            stepOrder: step.stepOrder,
          });
        }
      }
    } else {
      const parts = [step.conditionField, step.conditionOp, step.conditionValue];
      const filled = parts.filter((p) => p !== null && p !== undefined).length;
      if (filled !== 0 && filled !== 3) {
        issues.push({
          severity: 'blocker',
          code: 'INCOMPLETE_CONDITION',
          message: `Step ${step.stepOrder} has an incomplete condition; it needs a field, an operator and a value.`,
          stepId: step.id,
          stepOrder: step.stepOrder,
        });
      }

      if (filled === 3 && step.conditionValue != null && step.conditionValue <= 0) {
        issues.push({
          severity: 'warning',
          code: 'NON_POSITIVE_THRESHOLD',
          message: `Step ${step.stepOrder} triggers on ${conditionFieldLabel(step.conditionField!)} ${opLabel(step.conditionOp)} ${step.conditionValue}, which is not a positive amount.`,
          stepId: step.id,
          stepOrder: step.stepOrder,
        });
      }
    }
  }

  // Dua langkah berurutan dengan role sama membuat satu orang menyetujui dua kali.
  for (let i = 1; i < steps.length; i += 1) {
    const prev = steps[i - 1]!;
    const curr = steps[i]!;
    const currConditional = Boolean(curr.conditionField) || Boolean(curr.conditionGroup?.conditions.length);
    if (prev.approverRoleCode === curr.approverRoleCode && !currConditional) {
      issues.push({
        severity: 'warning',
        code: 'CONSECUTIVE_SAME_ROLE',
        message: `Steps ${prev.stepOrder} and ${curr.stepOrder} both go to ${curr.approverRoleCode}; the same person would approve twice in a row.`,
        stepId: curr.id,
        stepOrder: curr.stepOrder,
      });
    }
  }

  return issues;
}

/** Apakah daftar masalah menghalangi publish. */
export function hasBlockers(issues: PreflightIssue[]): boolean {
  return issues.some((i) => i.severity === 'blocker');
}
