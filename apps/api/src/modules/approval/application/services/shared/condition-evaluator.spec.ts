import { ConditionEvaluator } from './condition-evaluator';

/**
 * Evaluator tidak menyentuh DB untuk evaluasi syarat, jadi Prisma bisa dikosongkan.
 * Hanya `getDocValue`/`getTransaction` yang memakainya.
 */
function makeEvaluator() {
  return new ConditionEvaluator({} as never);
}

describe('ConditionEvaluator — kolom tunggal (perilaku lama tidak berubah)', () => {
  const ev = makeEvaluator();

  it('applies a single comparison', () => {
    expect(ev.evaluateCondition({ conditionField: 'estimatedTotal', conditionOp: '>', conditionValue: 5_000_000 }, 10_000_000)).toBe(true);
    expect(ev.evaluateCondition({ conditionField: 'estimatedTotal', conditionOp: '>', conditionValue: 5_000_000 }, 1_000_000)).toBe(false);
  });

  it('treats a step with no condition as always applying', () => {
    expect(ev.evaluateCondition({ conditionField: null, conditionOp: null, conditionValue: null }, 1)).toBe(true);
  });

  it('treats a missing document value as applying (unchanged legacy behaviour)', () => {
    expect(ev.evaluateCondition({ conditionField: 'estimatedTotal', conditionOp: '>', conditionValue: 5 }, null)).toBe(true);
  });
});

describe('ConditionEvaluator — grup majemuk menang bila ada', () => {
  const ev = makeEvaluator();
  const range = {
    combinator: 'AND' as const,
    conditions: [
      { field: 'estimatedTotal', op: '>', value: 5_000_000 },
      { field: 'estimatedTotal', op: '<=', value: 50_000_000 },
    ],
  };

  it('uses the group instead of the mirrored single column', () => {
    // Kolom tunggal mencerminkan aturan pertama (5jt), tetapi grup menambahkan
    // batas atas. 60jt lolos kolom tunggal namun harus gugur karena grup.
    const step = { conditionField: 'estimatedTotal', conditionOp: '>', conditionValue: 5_000_000, conditionGroup: range };
    expect(ev.evaluateCondition(step, 60_000_000)).toBe(false);
    expect(ev.evaluateCondition(step, 10_000_000)).toBe(true);
  });

  it('resolves each rule against its own field via the resolver', () => {
    const twoFields = {
      combinator: 'AND' as const,
      conditions: [
        { field: 'estimatedTotal', op: '>', value: 5_000_000 },
        { field: 'totalAmount', op: '<', value: 50_000_000 },
      ],
    };
    const doc: Record<string, number> = { estimatedTotal: 10_000_000, totalAmount: 40_000_000 };
    expect(ev.evaluateCondition(
      { conditionField: null, conditionOp: null, conditionValue: null, conditionGroup: twoFields },
      null,
      (field) => doc[field] ?? null,
    )).toBe(true);
  });
});
