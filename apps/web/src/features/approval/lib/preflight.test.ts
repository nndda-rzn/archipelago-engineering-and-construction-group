import { describe, expect, it } from 'vitest';
import type { WorkflowStep } from '@aec/api-contracts';
import { hasBlockers, preflight } from './preflight';

function step(overrides: Partial<WorkflowStep> = {}): WorkflowStep {
  return {
    id: 's1',
    definitionId: 'd1',
    stepOrder: 1,
    name: 'Manager approval',
    approverRoleCode: 'PROCUREMENT_MANAGER',
    conditionField: null,
    conditionOp: null,
    conditionValue: null,
    conditionGroup: null,
    ...overrides,
  };
}

describe('preflight', () => {
  it('flags a workflow with no steps as a blocker', () => {
    const issues = preflight({ steps: [], holdersByRole: {} });
    expect(issues).toHaveLength(1);
    expect(issues[0]!.code).toBe('NO_STEPS');
    expect(hasBlockers(issues)).toBe(true);
  });

  it('passes a clean chain with no issues', () => {
    const issues = preflight({
      steps: [step()],
      holdersByRole: { PROCUREMENT_MANAGER: 2 },
    });
    expect(issues).toEqual([]);
    expect(hasBlockers(issues)).toBe(false);
  });

  it('blocks a step whose role nobody holds', () => {
    const issues = preflight({
      steps: [step()],
      holdersByRole: { PROCUREMENT_MANAGER: 0 },
    });
    expect(issues.map((i) => i.code)).toContain('NO_HOLDER');
    expect(issues[0]!.stepId).toBe('s1');
    expect(hasBlockers(issues)).toBe(true);
  });

  it('blocks a role that does not exist at all', () => {
    const issues = preflight({
      steps: [step({ approverRoleCode: 'GHOST_ROLE' })],
      holdersByRole: {},
      knownRoleCodes: ['PROCUREMENT_MANAGER'],
    });
    expect(issues.map((i) => i.code)).toContain('ROLE_NOT_FOUND');
  });

  it('blocks a partially filled condition (silent failure)', () => {
    const issues = preflight({
      steps: [step({ conditionField: 'estimatedTotal', conditionOp: null, conditionValue: null })],
      holdersByRole: { PROCUREMENT_MANAGER: 1 },
    });
    expect(issues.map((i) => i.code)).toContain('INCOMPLETE_CONDITION');
    expect(hasBlockers(issues)).toBe(true);
  });

  it('accepts a fully specified condition', () => {
    const issues = preflight({
      steps: [step({ conditionField: 'estimatedTotal', conditionOp: '>', conditionValue: 5_000_000 })],
      holdersByRole: { PROCUREMENT_MANAGER: 1 },
    });
    expect(issues).toEqual([]);
  });

  it('accepts a complete condition group even when the mirrored columns are empty', () => {
    const issues = preflight({
      steps: [step({
        conditionField: null,
        conditionOp: null,
        conditionValue: null,
        conditionGroup: {
          combinator: 'AND',
          conditions: [
            { field: 'estimatedTotal', op: '>', value: 5_000_000 },
            { field: 'estimatedTotal', op: '<=', value: 50_000_000 },
          ],
        },
      })],
      holdersByRole: { PROCUREMENT_MANAGER: 1 },
    });
    expect(issues).toEqual([]);
  });

  it('warns (but does not block) on a non-positive threshold', () => {
    const issues = preflight({
      steps: [step({ conditionField: 'estimatedTotal', conditionOp: '>', conditionValue: 0 })],
      holdersByRole: { PROCUREMENT_MANAGER: 1 },
    });
    expect(issues.map((i) => i.code)).toContain('NON_POSITIVE_THRESHOLD');
    expect(hasBlockers(issues)).toBe(false);
  });

  it('warns when the same role approves twice in a row', () => {
    const issues = preflight({
      steps: [
        step({ id: 'a', stepOrder: 1, approverRoleCode: 'SUPER_ADMIN' }),
        step({ id: 'b', stepOrder: 2, approverRoleCode: 'SUPER_ADMIN' }),
      ],
      holdersByRole: { SUPER_ADMIN: 1 },
    });
    expect(issues.map((i) => i.code)).toContain('CONSECUTIVE_SAME_ROLE');
    expect(hasBlockers(issues)).toBe(false);
  });

  it('does not warn on consecutive same role when the second step is conditional', () => {
    const issues = preflight({
      steps: [
        step({ id: 'a', stepOrder: 1, approverRoleCode: 'SUPER_ADMIN' }),
        step({ id: 'b', stepOrder: 2, approverRoleCode: 'SUPER_ADMIN', conditionField: 'estimatedTotal', conditionOp: '>', conditionValue: 1_000 }),
      ],
      holdersByRole: { SUPER_ADMIN: 1 },
    });
    expect(issues.map((i) => i.code)).not.toContain('CONSECUTIVE_SAME_ROLE');
  });
});
