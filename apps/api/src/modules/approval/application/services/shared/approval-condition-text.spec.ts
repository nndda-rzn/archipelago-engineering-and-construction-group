import { approvalConditionText } from './approval-condition-text';

describe('approvalConditionText', () => {
  it('renders a group as "A > x or B > y"', () => {
    expect(
      approvalConditionText({
        conditionField: null,
        conditionOp: null,
        conditionValue: null,
        conditionGroup: {
          combinator: 'OR',
          conditions: [
            { field: 'estimatedTotal', op: '>', value: 5_000_000 },
            { field: 'estimatedTotal', op: '<', value: 10_000_000 },
          ],
        },
      }),
    ).toBe('estimatedTotal > 5.000.000 or estimatedTotal < 10.000.000');
  });

  it('joins an AND group with "and"', () => {
    expect(
      approvalConditionText({
        conditionField: null,
        conditionOp: null,
        conditionValue: null,
        conditionGroup: { combinator: 'AND', conditions: [{ field: 'totalAmount', op: '>=', value: 1_000 }] },
      }),
    ).toBe('totalAmount >= 1.000');
  });

  it('renders a single-column condition', () => {
    expect(approvalConditionText({ conditionField: 'totalAmount', conditionOp: '>', conditionValue: 5_000_000 })).toBe(
      'totalAmount > 5.000.000',
    );
  });

  it('normalises == to =', () => {
    expect(approvalConditionText({ conditionField: 'totalAmount', conditionOp: '==', conditionValue: 100 })).toBe(
      'totalAmount = 100',
    );
  });

  it('returns null when there is no condition', () => {
    expect(approvalConditionText({ conditionField: null, conditionOp: null, conditionValue: null })).toBeNull();
  });
});
