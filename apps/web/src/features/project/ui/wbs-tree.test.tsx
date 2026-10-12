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
  id, code, name, description: null, sortOrder: 0, progressPercent: 0, plannedStart: null, plannedEnd: null,
  responsibleManager: null, isMilestone: false,
  rollup: { budget: 0, actual: 0, progress: null, childCount: children.length }, children, ...extra,
});

const tree: WbsItem[] = [
  node('r1', '1', 'Engineering', { rollup: { budget: 4_200_000_000, actual: 1_100_000_000, progress: 68, childCount: 1 } }, [
    node('c1', '1.1', 'Detail Engineering', { progressPercent: 82, rollup: { budget: 1_100_000_000, actual: 400_000_000, progress: 82, childCount: 0 } }),
  ]),
  node('r2', '2', 'Commissioning', { isMilestone: true, rollup: { budget: 0, actual: 0, progress: null, childCount: 0 } }),
];

const render = (props: Partial<Parameters<typeof WbsTree>[0]> = {}) =>
  renderWithProviders(
    <WbsTree tree={tree} selectedId={null} onSelect={vi.fn()} onAddChild={vi.fn()} {...props} />,
  );

describe('WbsTree', () => {
  beforeEach(() => localStorage.clear());

  it('renders a compact rollup budget per node', () => {
    render();
    expect(screen.getAllByText(/Rp/).length).toBeGreaterThan(0);
  });

  it('marks the selected row with aria-selected', () => {
    render({ selectedId: 'r1' });
    expect(screen.getByRole('treeitem', { name: '1 Engineering' }).getAttribute('aria-selected')).toBe('true');
  });

  it('exposes only one tab stop (roving tabindex)', () => {
    render();
    const items = screen.getAllByRole('treeitem');
    expect(items.filter((el) => el.getAttribute('tabindex') === '0')).toHaveLength(1);
  });

  it('moves focus to the next node with ArrowDown', () => {
    render();
    const first = screen.getByRole('treeitem', { name: '1 Engineering' });
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(screen.getByRole('treeitem', { name: '1.1 Detail Engineering' }).getAttribute('tabindex')).toBe('0');
    expect(screen.getByRole('treeitem', { name: '1 Engineering' }).getAttribute('tabindex')).toBe('-1');
  });

  it('collapses a node with ArrowLeft and expands with ArrowRight', () => {
    render();
    const root = screen.getByRole('treeitem', { name: '1 Engineering' });
    root.focus();
    fireEvent.keyDown(root, { key: 'ArrowLeft' });
    expect(screen.queryByText('Detail Engineering')).toBeNull();
    fireEvent.keyDown(root, { key: 'ArrowRight' });
    expect(screen.getByText('Detail Engineering')).toBeTruthy();
  });

  it('selects a node when its row is clicked', () => {
    const onSelect = vi.fn();
    render({ onSelect });
    fireEvent.click(screen.getByRole('treeitem', { name: '1 Engineering' }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1' }));
  });

  it('renders a milestone flag for a milestone node', () => {
    render();
    expect(screen.getByLabelText(/milestone/i)).toBeTruthy();
  });

  it('shows an honest dash (neutral-500) when progress is unknown', () => {
    render();
    const dash = screen.getByRole('treeitem', { name: '2 Commissioning' }).querySelector('[data-slot="wbs-progress-unknown"]');
    expect(dash).toBeTruthy();
    expect(dash!.className).toContain('text-neutral-500');
  });
});
