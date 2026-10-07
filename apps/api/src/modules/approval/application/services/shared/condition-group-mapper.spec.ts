import { Prisma } from '@prisma/client';
import { toConditionGroup, toConditionGroupLoose, toJsonInput, toNumber, mirrorFirstCondition } from './condition-group-mapper';

describe('condition-group-mapper', () => {
  describe('toNumber', () => {
    it('returns null for null/undefined', () => {
      expect(toNumber(null)).toBeNull();
      expect(toNumber(undefined as unknown as null)).toBeNull();
    });

    it('coerces Prisma Decimal-like values to number', () => {
      expect(toNumber(new Prisma.Decimal('5000000'))).toBe(5_000_000);
      expect(toNumber(42)).toBe(42);
    });
  });

  describe('toConditionGroup', () => {
    it('returns null for null and non-object values', () => {
      expect(toConditionGroup(null)).toBeNull();
      expect(toConditionGroup([] as unknown as Prisma.JsonValue)).toBeNull();
      expect(toConditionGroup('x' as unknown as Prisma.JsonValue)).toBeNull();
    });

    it('returns null when combinator is unknown or conditions is not an array', () => {
      expect(toConditionGroup({ combinator: 'X', conditions: [] })).toBeNull();
      expect(toConditionGroup({ combinator: 'AND', conditions: 'nope' })).toBeNull();
    });

    it('drops malformed conditions and keeps the valid ones', () => {
      expect(
        toConditionGroup({
          combinator: 'AND',
          conditions: [
            { field: 'estimatedTotal', op: '>', value: 5_000_000 },
            { field: 'x', op: '>', value: 'NaN' },
            'not-an-object',
          ],
        }),
      ).toEqual({ combinator: 'AND', conditions: [{ field: 'estimatedTotal', op: '>', value: 5_000_000 }] });
    });

    it('returns null when no valid condition remains', () => {
      expect(toConditionGroup({ combinator: 'OR', conditions: [{ field: 'a', op: '>', value: 'NaN' }] })).toBeNull();
    });
  });

  describe('toConditionGroupLoose', () => {
    it('accepts an unknown value and applies the same validation', () => {
      expect(toConditionGroupLoose({ combinator: 'OR', conditions: [{ field: 'a', op: '>', value: 1 }] })).toEqual({
        combinator: 'OR',
        conditions: [{ field: 'a', op: '>', value: 1 }],
      });
      expect(toConditionGroupLoose(null)).toBeNull();
    });
  });

  describe('toJsonInput', () => {
    it('returns undefined for null/undefined groups', () => {
      expect(toJsonInput(null)).toBeUndefined();
      expect(toJsonInput(undefined)).toBeUndefined();
    });

    it('strips a ConditionGroup down to a plain object', () => {
      expect(toJsonInput({ combinator: 'AND', conditions: [{ field: 'a', op: '>', value: 1 }] })).toEqual({
        combinator: 'AND',
        conditions: [{ field: 'a', op: '>', value: 1 }],
      });
    });
  });

  describe('mirrorFirstCondition', () => {
    it('mirrors the first rule of a group', () => {
      expect(
        mirrorFirstCondition({ combinator: 'AND', conditions: [{ field: 'estimatedTotal', op: '>', value: 5 }] }),
      ).toEqual({ conditionField: 'estimatedTotal', conditionOp: '>', conditionValue: 5 });
    });

    it('returns all-null for an empty or missing group', () => {
      expect(mirrorFirstCondition(null)).toEqual({ conditionField: null, conditionOp: null, conditionValue: null });
      expect(mirrorFirstCondition({ combinator: 'AND', conditions: [] })).toEqual({
        conditionField: null,
        conditionOp: null,
        conditionValue: null,
      });
    });
  });
});
