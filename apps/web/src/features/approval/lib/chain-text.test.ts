import { describe, expect, it } from 'vitest';
import { chainConditionText, summariseHolderNames, subjectOf } from './chain-text';
import { formatIdr } from '@/shared/lib/format';
import type { WorkflowStep } from '@aec/api-contracts';

const step = (over: Partial<WorkflowStep>): WorkflowStep => ({
  id: 's1', definitionId: 'd1', stepOrder: 1, name: 'Manager', approverRoleCode: 'PROCUREMENT_MANAGER',
  conditionField: null, conditionOp: null, conditionValue: null, conditionGroup: null,
  ...over,
}) as WorkflowStep;

describe('subjectOf', () => {
  it('names the human document for each transaction type', () => {
    expect(subjectOf('PurchaseOrder')).toBe('Purchase order');
    expect(subjectOf('PurchaseRequisition')).toBe('Purchase requisition');
  });
});

describe('chainConditionText', () => {
  it('renders a single-column condition with a readable field label', () => {
    expect(chainConditionText(step({ conditionField: 'estimatedTotal', conditionOp: '>', conditionValue: 5_000_000 })))
      .toBe(`Estimated total > ${formatIdr(5_000_000)}`);
  });

  it('renders a group joined by "or"/"and"', () => {
    expect(
      chainConditionText(step({
        conditionGroup: {
          combinator: 'OR',
          conditions: [
            { field: 'estimatedTotal', op: '>', value: 5_000_000 },
            { field: 'estimatedTotal', op: '<=', value: 50_000_000 },
          ],
        },
      } as Partial<WorkflowStep>)),
    ).toBe(`Estimated total > ${formatIdr(5_000_000)} or Estimated total ≤ ${formatIdr(50_000_000)}`);
  });

  it('returns null when the step has no condition', () => {
    expect(chainConditionText(step({}))).toBeNull();
  });
});

describe('summariseHolderNames', () => {
  it('shows a single name in full', () => {
    expect(summariseHolderNames(['Budi'])).toBe('Budi');
  });

  it('joins up to three names', () => {
    expect(summariseHolderNames(['A', 'B', 'C'])).toBe('A, B, C');
  });

  it('summarises more than three as a count', () => {
    expect(summariseHolderNames(['A', 'B', 'C', 'D'])).toBe('4 people');
  });

  it('is empty for no holders', () => {
    expect(summariseHolderNames([])).toBe('');
  });
});
