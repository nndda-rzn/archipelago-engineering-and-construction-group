import { describe, expect, it } from 'vitest';
import { rankByVariance } from './project-ranking-bar';

const items = [
  { projectId: 'p1', projectCode: 'A', projectName: 'A', variance: -10, health: 'CRITICAL' as const },
  { projectId: 'p2', projectCode: 'B', projectName: 'B', variance: 50, health: 'ON_TRACK' as const },
];

describe('rankByVariance', () => {
  it('sorts worst (most negative) first', () => {
    expect(rankByVariance(items as never)[0]!.projectCode).toBe('A');
  });
  it('limits the result', () => {
    expect(rankByVariance(items as never, 1)).toHaveLength(1);
  });
  it('handles a single project without breaking', () => {
    expect(rankByVariance([items[0]] as never)).toHaveLength(1);
  });
  it('returns empty for an empty list', () => {
    expect(rankByVariance([])).toEqual([]);
  });
});
