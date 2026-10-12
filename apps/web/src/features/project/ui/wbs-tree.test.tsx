import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { WbsTree } from './wbs-tree';
import type { WbsItem } from '@aec/api-contracts';

const node = (
  id: string,
  code: string,
  name: string,
  extra: Partial<WbsItem> = {},
  children: WbsItem[] = [],
): WbsItem => ({
  id,
  code,
  name,
  description: null,
  sortOrder: 0,
  progressPercent: 0,
  plannedStart: null,
  plannedEnd: null,
  responsibleManager: null,
  isMilestone: false,
  rollup: { budget: 0, actual: 0, progress: null, childCount: children.length },
  children,
  ...extra,
});

const tree: WbsItem[] = [
  node('r1', '1', 'Engineering', { rollup: { budget: 4_200_000_000, actual: 1_100_000_000, progress: 68, childCount: 1 } }, [
    node('c1', '1.1', 'Detail Engineering', { progressPercent: 82, rollup: { budget: 1_100_000_000, actual: 400_000_000, progress: 82, childCount: 0 } }),
  ]),
  node('r2', '2', 'Commissioning', { isMilestone: true, rollup: { budget: 0, actual: 0, progress: null, childCount: 0 } }),
];

describe('WbsTree', () => {
  beforeEach(() => localStorage.clear());

  it('renders a compact rollup budget per node', () => {
    renderWithProviders(<WbsTree tree={tree} selectedId={null} onSelect={vi.fn()} onAddChild={vi.fn()} />);
    expect(screen.getAllByText(/Rp/).length).toBeGreaterThan(0);
  });

  it('marks the selected row with aria-selected', () => {
    renderWithProviders(<WbsTree tree={tree} selectedId="r1" onSelect={vi.fn()} onAddChild={vi.fn()} />);
    expect(screen.getByRole('treeitem', { name: '1 Engineering' }).getAttribute('aria-selected')).toBe('true');
  });

  it('selects a node when its row is clicked', () => {
    const onSelect = vi.fn();
    renderWithProviders(<WbsTree tree={tree} selectedId={null} onSelect={onSelect} onAddChild={vi.fn()} />);
    fireEvent.click(screen.getByRole('treeitem', { name: '1 Engineering' }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1' }));
  });

  it('renders a milestone flag for a milestone node', () => {
    renderWithProviders(<WbsTree tree={tree} selectedId={null} onSelect={vi.fn()} onAddChild={vi.fn()} />);
    expect(screen.getByLabelText(/milestone/i)).toBeTruthy();
  });

  it('collapses a node’s children when its toggle is clicked', () => {
    renderWithProviders(<WbsTree tree={tree} selectedId={null} onSelect={vi.fn()} onAddChild={vi.fn()} />);
    expect(screen.getByText('Detail Engineering')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Collapse 1'));
    expect(screen.queryByText('Detail Engineering')).toBeNull();
  });

  it('shows an honest dash when progress is unknown', () => {
    renderWithProviders(<WbsTree tree={tree} selectedId={null} onSelect={vi.fn()} onAddChild={vi.fn()} />);
    // Commissioning has rollup.progress = null → renders an em dash, not 0%
    expect(screen.getByRole('treeitem', { name: '2 Commissioning' }).textContent).toContain('—');
  });
});
