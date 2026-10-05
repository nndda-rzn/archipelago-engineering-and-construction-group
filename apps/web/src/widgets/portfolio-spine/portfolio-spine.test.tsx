import { describe, expect, it } from 'vitest';
import { portfolioColumns } from './portfolio-spine';

describe('portfolioColumns', () => {
  it('includes health, utilization, budget-vs-actual, variance, revenue and margin columns', () => {
    const ids = portfolioColumns.map(
      (c) => (c as { id?: string; accessorKey?: string }).id ?? (c as { accessorKey?: string }).accessorKey,
    );
    for (const key of ['projectCode', 'client', 'health', 'utilization', 'budgetVsActual', 'variance', 'revenue', 'margin']) {
      expect(ids).toContain(key);
    }
  });
});
