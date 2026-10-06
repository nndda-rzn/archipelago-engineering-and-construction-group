import { evaluateCondition, evaluateConditionGroup } from '@aec/api-contracts';

describe('evaluateCondition — satu aturan', () => {
  it('compares against the document value', () => {
    expect(evaluateCondition({ op: '>', value: 5 }, 10)).toBe(true);
    expect(evaluateCondition({ op: '>', value: 5 }, 5)).toBe(false);
    expect(evaluateCondition({ op: '>=', value: 5 }, 5)).toBe(true);
    expect(evaluateCondition({ op: '==', value: 5 }, 5)).toBe(true);
  });

  it('treats a missing document value as not matching', () => {
    expect(evaluateCondition({ op: '>', value: 5 }, null)).toBe(false);
  });
});

describe('evaluateConditionGroup — AND/OR', () => {
  const range = {
    combinator: 'AND' as const,
    conditions: [
      { field: 'estimatedTotal', op: '>', value: 5_000_000 },
      { field: 'estimatedTotal', op: '<=', value: 50_000_000 },
    ],
  };

  it('AND requires every rule to hold — a range works', () => {
    expect(evaluateConditionGroup(range, 10_000_000)).toBe(true);
    expect(evaluateConditionGroup(range, 3_000_000)).toBe(false);
    expect(evaluateConditionGroup(range, 60_000_000)).toBe(false);
  });

  it('OR requires only one rule to hold', () => {
    const either = {
      combinator: 'OR' as const,
      conditions: [
        { field: 'estimatedTotal', op: '<', value: 1_000_000 },
        { field: 'estimatedTotal', op: '>', value: 100_000_000 },
      ],
    };
    expect(evaluateConditionGroup(either, 500_000)).toBe(true);
    expect(evaluateConditionGroup(either, 200_000_000)).toBe(true);
    expect(evaluateConditionGroup(either, 50_000_000)).toBe(false);
  });

  it('treats an empty group as always applying (not never)', () => {
    expect(evaluateConditionGroup({ combinator: 'AND', conditions: [] }, 1)).toBe(true);
    expect(evaluateConditionGroup({ combinator: 'OR', conditions: [] }, 1)).toBe(true);
  });
});
