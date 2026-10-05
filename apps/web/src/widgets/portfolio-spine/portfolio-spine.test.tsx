import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { portfolioColumns } from './portfolio-spine';

describe('portfolioColumns', () => {
  it('includes the EVM column alongside the visual columns', () => {
    const ids = portfolioColumns.map(
      (c) => (c as { id?: string; accessorKey?: string }).id ?? (c as { accessorKey?: string }).accessorKey,
    );
    for (const key of ['projectCode', 'client', 'health', 'utilization', 'budgetVsActual', 'variance', 'revenue', 'margin', 'evm']) {
      expect(ids).toContain(key);
    }
  });

  it('renders — for a project without EVM data and CPI/SPI when present', () => {
    const noEvm = portfolioColumns.find((c) => (c as { id?: string }).id === 'evm')!;
    const withEvm = portfolioColumns.find((c) => (c as { id?: string }).id === 'evm')!;

    const rowBase = {
      projectId: 'p1', projectCode: 'PRJ-1', projectName: 'A', client: 'C', status: 'ACTIVE',
      contractValue: 100, budget: 100, actual: 40, revenue: 50, variance: 60, utilization: 40,
      health: 'ON_TRACK' as const,
    };

    render(
      <>
        {/* @ts-expect-error minimal cell context for a focused render */}
        {noEvm.cell!({ row: { original: { ...rowBase, evm: undefined } } })}
        {/* @ts-expect-error minimal cell context for a focused render */}
        {withEvm.cell!({ row: { original: { ...rowBase, evm: { hasEvm: true, cpi: 1.25, spi: 0.83 } } } })}
      </>,
    );
    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.getByText(/1\.25/)).toBeTruthy();
  });

  it('gives numeric columns an explicit size so 9 columns do not squeeze the header', () => {
    const sized = portfolioColumns.filter((c) => (c as { size?: number }).size !== undefined);
    expect(sized.length).toBeGreaterThanOrEqual(6);
  });

  it('right-aligns numeric columns via meta', () => {
    const numericIds = ['variance', 'revenue', 'margin', 'evm'];
    for (const id of numericIds) {
      const col = portfolioColumns.find((c) => (c as { id?: string }).id === id) as { meta?: { align?: string } };
      expect(col.meta?.align).toBe('right');
    }
  });
});
