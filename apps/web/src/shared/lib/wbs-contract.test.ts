import { describe, expect, it } from 'vitest';
import { wbsItemSchema, updateWbsItemSchema } from '@aec/api-contracts';

const node = {
  id: 'w1',
  code: '1.1',
  name: 'Detail Engineering',
  description: null,
  sortOrder: 1,
  progressPercent: 40,
  plannedStart: '2026-01-01T00:00:00.000Z',
  plannedEnd: null,
  responsibleManager: 'Ahmad',
  isMilestone: false,
  rollup: { budget: 1_100_000_000, actual: 400_000_000, progress: 40, childCount: 0 },
  children: [],
};

describe('wbsItemSchema', () => {
  it('parses management fields and the rollup block', () => {
    const parsed = wbsItemSchema.parse(node);
    expect(parsed.rollup.budget).toBe(1_100_000_000);
    expect(parsed.progressPercent).toBe(40);
    expect(parsed.isMilestone).toBe(false);
    expect(parsed.responsibleManager).toBe('Ahmad');
  });

  it('accepts a null rollup progress (unknown, not zero)', () => {
    const parsed = wbsItemSchema.parse({
      ...node,
      progressPercent: 0,
      rollup: { budget: 0, actual: 0, progress: null, childCount: 0 },
    });
    expect(parsed.rollup.progress).toBeNull();
  });

  it('parses nested children recursively', () => {
    const parsed = wbsItemSchema.parse({ ...node, children: [node] });
    expect(parsed.children[0]!.code).toBe('1.1');
  });

  it('tolerates a legacy node that predates the management fields', () => {
    const legacy = { id: 'w9', code: '9', name: 'Legacy', description: null, sortOrder: 0, children: [] };
    const parsed = wbsItemSchema.parse(legacy);
    expect(parsed.progressPercent).toBe(0);
    expect(parsed.isMilestone).toBe(false);
    expect(parsed.rollup).toEqual({ budget: 0, actual: 0, progress: null, childCount: 0 });
  });
});

describe('updateWbsItemSchema', () => {
  it('accepts a partial update payload', () => {
    expect(updateWbsItemSchema.parse({ progressPercent: 55 }).progressPercent).toBe(55);
  });

  it('rejects a progress above 100', () => {
    expect(updateWbsItemSchema.safeParse({ progressPercent: 120 }).success).toBe(false);
  });
});
