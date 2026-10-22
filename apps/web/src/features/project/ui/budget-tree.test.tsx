import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { BudgetSummary } from '@aec/api-contracts';
import { BudgetTree } from './budget-tree';

type Node = BudgetSummary['wbs'][number];

const node = (over: Partial<Node> & Pick<Node, 'id' | 'code' | 'name'>): Node => ({
  parentId: null,
  depth: 0,
  budget: 0,
  used: 0,
  remaining: 0,
  byCostType: {},
  plannedValue: 0,
  itemCount: 0,
  childrenCount: 0,
  ...over,
});

const nodes: Node[] = [
  // Induk sengaja beda angka dari anak-anaknya supaya test membuktikan rollup,
  // bukan kebetulan menemukan angka anak.
  node({ id: 'p', code: '1', name: 'Engineering', budget: 400, used: 77, remaining: 323, byCostType: { LABOR: 400 }, itemCount: 2, childrenCount: 2 }),
  node({ id: 'c1', code: '1.1', name: 'Detail Engineering', parentId: 'p', depth: 1, budget: 100, used: 40, remaining: 60, byCostType: { LABOR: 100 }, itemCount: 1 }),
  node({ id: 'c2', code: '1.2', name: 'Shop Drawings', parentId: 'p', depth: 1, budget: 300, used: 37, remaining: 263, byCostType: { LABOR: 300 }, itemCount: 1 }),
];

describe('BudgetTree', () => {
  it('renders children under their parent', () => {
    render(<BudgetTree nodes={nodes} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText('Detail Engineering')).toBeTruthy();
    expect(screen.getByText('Shop Drawings')).toBeTruthy();
  });

  it('collapses a parent and hides its children', () => {
    render(<BudgetTree nodes={nodes} selectedId={null} onSelect={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Collapse Engineering/ }));
    expect(screen.queryByText('Detail Engineering')).toBeNull();
  });

  it('exposes aria-expanded on parents only', () => {
    render(<BudgetTree nodes={nodes} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: /Collapse Engineering/ }).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: /Detail Engineering/ }).getAttribute('aria-expanded')).toBeNull();
  });

  it('selects a node when its row is clicked', () => {
    const onSelect = vi.fn();
    render(<BudgetTree nodes={nodes} selectedId={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /Detail Engineering/ }));
    expect(onSelect).toHaveBeenCalledWith('c1');
  });

  it('marks the selected node with aria-current', () => {
    render(<BudgetTree nodes={nodes} selectedId="c1" onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: /Detail Engineering/ }).getAttribute('aria-current')).toBe('true');
  });

  it('shows the rollup budget and spend on the parent row', () => {
    render(<BudgetTree nodes={nodes} selectedId={null} onSelect={() => {}} />);
    // Baris induk dibatasi ke <li> miliknya: tombol lipat juga berlabel nama induk.
    const row = screen.getByRole('button', { name: /^1\s*Engineering$/ }).closest('li')!;
    expect(within(row).getByText('400')).toBeTruthy();
    expect(within(row).getByText('77')).toBeTruthy();
  });

  it('shows an empty state when there are no nodes', () => {
    render(<BudgetTree nodes={[]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText(/no WBS/i)).toBeTruthy();
  });

  it('renders a node whose parent is missing as a root', () => {
    render(<BudgetTree nodes={[node({ id: 'x', code: '9', name: 'Orphan', parentId: 'ghost' })]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText('Orphan')).toBeTruthy();
  });
});
