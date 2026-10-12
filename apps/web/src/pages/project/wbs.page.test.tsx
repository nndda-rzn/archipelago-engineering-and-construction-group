import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSyncExternalStore } from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import type { WbsItem } from '@aec/api-contracts';

const nav = vi.hoisted(() => {
  const state = { search: {} as Record<string, unknown>, listeners: new Set<() => void>() };
  return {
    state,
    get: () => state.search,
    set: (next: Record<string, unknown>) => {
      state.search = next;
      for (const l of state.listeners) l();
    },
    subscribe: (l: () => void) => {
      state.listeners.add(l);
      return () => state.listeners.delete(l);
    },
  };
});

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...rest }: { children: React.ReactNode }) => <a {...rest}>{children}</a>,
  useNavigate: () => (opts: { search?: unknown }) => {
    const next = typeof opts?.search === 'function'
      ? (opts.search as (p: Record<string, unknown>) => Record<string, unknown>)(nav.state.search)
      : opts?.search;
    if (next) nav.set(next as Record<string, unknown>);
  },
  useSearch: () => useSyncExternalStore(nav.subscribe, nav.get, nav.get),
}));

const node = (id: string, code: string, name: string, children: WbsItem[] = []): WbsItem => ({
  id, code, name, description: null, sortOrder: 0, progressPercent: 0, plannedStart: null, plannedEnd: null,
  responsibleManager: null, isMilestone: false, rollup: { budget: 0, actual: 0, progress: null, childCount: children.length }, children,
});

const treeState = vi.hoisted(() => ({ value: [] as WbsItem[], isLoading: false, isError: false, refetch: vi.fn() }));

vi.mock('@/entities/wbs', () => ({
  useWbsTree: () => ({ data: treeState.value, isLoading: treeState.isLoading, isError: treeState.isError, refetch: treeState.refetch }),
  useUpdateWbsItem: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
  useDeleteWbsItem: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useWbsLinks: () => ({ data: { itemId: 'w1', total: 0, links: [] }, isLoading: false, isError: false }),
}));

vi.mock('@/entities/project', () => ({
  useProjects: () => ({
    data: {
      items: [{
        id: 'p1', code: 'PRJ-EPC-2027-014', name: 'EPC Industrial Processing Facility', client: 'PT Klien Utama',
        legalEntityId: 'le1', businessUnit: null, location: 'Karawang', currency: 'IDR',
        contractValue: 4_800_000_000_000, startDate: '2026-01-05T00:00:00.000Z', completionDate: '2027-07-31T00:00:00.000Z',
        director: null, manager: 'Ahmad', type: 'EPC', priority: 'HIGH', status: 'ACTIVE', createdAt: '', updatedAt: '',
      }],
    },
    isLoading: false,
  }),
}));

// Picker punya test sendiri; di sini cukup stub agar tidak bergantung hook-nya.
vi.mock('@/features/project/ui/project-picker', () => ({
  ProjectPicker: ({ value }: { value: string }) => <div data-testid="project-picker">{value || 'none'}</div>,
}));

import { WbsPage } from './wbs.page';

describe('WbsPage', () => {
  beforeEach(() => {
    nav.state.search = {};
    treeState.value = [
      { ...node('w1', '1', 'Engineering', [node('w2', '1.1', 'Detail')]), rollup: { budget: 4_200_000_000, actual: 1_100_000_000, progress: 68, childCount: 1 } },
      { ...node('w3', '2', 'Procurement'), rollup: { budget: 2_000_000_000, actual: 900_000_000, progress: 45, childCount: 0 } },
    ];
    treeState.isLoading = false;
    treeState.isError = false;
  });

  it('reads the project id from the URL deep-link', () => {
    nav.state.search = { project: 'p1' };
    renderWithProviders(<WbsPage />);
    expect(screen.getByRole('tree')).toBeTruthy();
  });

  it('shows an empty state before a project is chosen', () => {
    renderWithProviders(<WbsPage />);
    expect(screen.getByText(/Select a project/i)).toBeTruthy();
  });

  it('shows an error state with retry when the tree fails', () => {
    nav.state.search = { project: 'p1' };
    treeState.isError = true;
    renderWithProviders(<WbsPage />);
    expect(screen.getByText(/Failed to load data/i)).toBeTruthy();
  });

  it('selecting a node opens the inspector', () => {
    nav.state.search = { project: 'p1' };
    renderWithProviders(<WbsPage />);
    fireEvent.click(screen.getByRole('treeitem', { name: '1 Engineering' }));
    expect(screen.getByLabelText('WBS item detail')).toBeTruthy();
  });

  it('shows project context in the identity band', () => {
    nav.state.search = { project: 'p1' };
    renderWithProviders(<WbsPage />);
    expect(screen.getByText(/PT Klien Utama/)).toBeTruthy();
    expect(screen.getByText(/PRJ-EPC-2027-014/)).toBeTruthy();
  });

  it('summarises the breakdown above the ledger', () => {
    nav.state.search = { project: 'p1' };
    renderWithProviders(<WbsPage />);
    expect(screen.getByLabelText('WBS summary')).toBeTruthy();
    expect(screen.getByText(/Total budget/i)).toBeTruthy();
    // 4.2B + 2.0B = 6.2B across two roots
    expect(screen.getByText(/Rp 6,2 M/)).toBeTruthy();
  });
});
