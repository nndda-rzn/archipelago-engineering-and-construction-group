import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { BudgetStatement as Statement } from '@aec/api-contracts';
import { BudgetStatement } from './budget-statement';

const row = (over: Partial<Statement['rows'][number]> = {}): Statement['rows'][number] => ({
  id: 'w1', code: '1', name: 'Engineering', parentId: null, depth: 0, childrenCount: 0,
  baseline: 1000, revised: 1200, committed: 300, actual: 900,
  available: 0, variance: 300, varianceBaseline: 200,
  byCostType: { LABOR: 1200 }, ...over,
});

const statement = (over: Partial<Statement> = {}): Statement => ({
  projectId: 'p1', currency: 'IDR',
  baseline: { id: 'b1', version: 1, status: 'FROZEN', label: null, reason: null, frozenAt: '2026-01-01T00:00:00.000Z', total: 1000 },
  versions: [{ id: 'b1', version: 1, status: 'FROZEN', label: null, reason: null, frozenAt: '2026-01-01T00:00:00.000Z', total: 1000 }],
  openRevision: false,
  rows: [row()],
  composition: [{ costType: 'LABOR', amount: 1200 }],
  totals: {
    baseline: 1000, revised: 1200, committed: 300, actual: 900,
    available: 0, variance: 300, varianceBaseline: 200,
    contractValue: 5000, eac: 1300, vac: -100,
  },
  unallocated: { committed: 0, actual: 0 },
  reconciliation: { ledgerOut: 900, journalExpense610: 0, doubleCountRisk: false },
  warnings: { overContract: false, overCommitted: [], noBudget: [], pvCoverage: { pv: 600, bac: 1200, status: 'COMPLETE' } },
  costCoverage: { allocatedNodes: 1, totalNodes: 1 },
  ...over,
});

describe('BudgetStatement', () => {
  it('renders a semantic table with a caption and seven columns', () => {
    render(<BudgetStatement statement={statement()} selectedId={null} onSelect={vi.fn()} published />);
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('columnheader')).toHaveLength(7);
    expect(table.querySelector('caption')).toBeTruthy();
  });

  it('renders one data row per statement row, plus the total rows', () => {
    render(<BudgetStatement statement={statement()} selectedId={null} onSelect={vi.fn()} published />);
    // header (1) + data (1) + footer total (2: angka dan baris EAC/VAC)
    expect(screen.getAllByRole('row')).toHaveLength(4);
    expect(screen.getAllByTestId(/^row-/)).toHaveLength(1);
  });

  it('renders a total row whose values match totals', () => {
    render(<BudgetStatement statement={statement()} selectedId={null} onSelect={vi.fn()} published />);
    const total = screen.getByTestId('statement-total');
    expect(within(total).getByTitle(/1\.200/)).toBeTruthy();
  });

  it('shows EAC and VAC on the total row only', () => {
    render(<BudgetStatement statement={statement()} selectedId={null} onSelect={vi.fn()} published />);
    expect(screen.getByTestId('statement-total').textContent).toMatch(/EAC/i);
    expect(screen.queryByTestId('row-eac')).toBeNull();
  });

  it('shows a dash instead of Rp 0 when no baseline exists', () => {
    render(
      <BudgetStatement
        statement={statement({ baseline: null, rows: [row({ baseline: 0 })] })}
        selectedId={null} onSelect={vi.fn()} published={false}
      />,
    );
    expect(screen.getByTestId('cell-baseline-w1').textContent).toBe('—');
  });

  it('marks the selected row with aria-current and expands the inspector inline', () => {
    render(<BudgetStatement statement={statement()} selectedId="w1" onSelect={vi.fn()} published />);
    const selected = screen.getByTestId('row-w1');
    expect(selected.getAttribute('aria-current')).toBe('true');
    expect(screen.getByRole('complementary', { name: /budget detail/i })).toBeTruthy();
  });

  it('calls onSelect with the row id when a row is clicked', () => {
    const onSelect = vi.fn();
    render(<BudgetStatement statement={statement()} selectedId={null} onSelect={onSelect} published />);
    fireEvent.click(screen.getByRole('button', { name: /^1\s*Engineering$/ }));
    expect(onSelect).toHaveBeenCalledWith('w1');
  });

  it('indents a child row by its depth', () => {
    render(
      <BudgetStatement
        statement={statement({ rows: [row(), row({ id: 'w2', code: '1.1', parentId: 'w1', depth: 1 })] })}
        selectedId={null} onSelect={vi.fn()} published
      />,
    );
    expect(screen.getByTestId('row-w2').querySelector('[data-depth]')?.getAttribute('data-depth')).toBe('1');
  });

  it('never relies on colour alone for variance', () => {
    render(
      <BudgetStatement
        statement={statement({ rows: [row({ variance: -300 })] })}
        selectedId={null} onSelect={vi.fn()} published
      />,
    );
    expect(screen.getByTestId('row-w1').textContent).toMatch(/−/);
  });

  it('scrolls horizontally instead of squeezing six columns', () => {
    render(<BudgetStatement statement={statement()} selectedId={null} onSelect={vi.fn()} published />);
    expect(screen.getByTestId('statement-scroll').className).toContain('overflow-x-auto');
  });
});
