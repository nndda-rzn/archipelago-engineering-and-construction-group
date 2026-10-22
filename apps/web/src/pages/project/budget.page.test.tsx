import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';

const summary = vi.hoisted(() => ({
  projectId: 'p1',
  currency: 'IDR',
  baseline: { id: 'b1', version: 2, status: 'FROZEN', label: 'VO-01', reason: null, frozenAt: '2026-10-22T00:00:00.000Z', total: 400 },
  previous: null,
  // Revisi terbuka: tabel boleh diedit, jadi form inspector tampil.
  openRevision: true,
  rows: [
    { id: 'p', code: '1', name: 'Engineering', parentId: null, depth: 0, childrenCount: 1, baseline: 400, revised: 450, committed: 100, actual: 40, available: 310, variance: 410, varianceBaseline: 50, byCostType: { LABOR: 450 } },
    { id: 'c1', code: '1.1', name: 'Detail Engineering', parentId: 'p', depth: 1, childrenCount: 0, baseline: 400, revised: 450, committed: 100, actual: 40, available: 310, variance: 410, varianceBaseline: 50, byCostType: { LABOR: 450 } },
  ],
  totals: { baseline: 400, revised: 450, committed: 100, actual: 40, available: 310, variance: 410, varianceBaseline: 50, contractValue: 1000, eac: 470, vac: -20 },
  unallocated: { committed: 0, actual: 0 },
  reconciliation: { ledgerOut: 40, journalExpense610: 0, doubleCountRisk: false },
  warnings: { overContract: false, overCommitted: [], noBudget: [], pvCoverage: { pv: 270, bac: 450, status: 'COMPLETE' } },
  costCoverage: { allocatedNodes: 2, totalNodes: 2 },
}));

const mutate = vi.hoisted(() => vi.fn());

vi.mock('@aec/ui', async () => {
  const actual = await vi.importActual<typeof import('@aec/ui')>('@aec/ui');
  return {
    ...actual,
    EntitySelect: ({ onValueChange, options }: { onValueChange: (v: string) => void; options: Array<{ value: string }> }) => (
      <button type="button" onClick={() => onValueChange(options[0]?.value ?? '')}>pick-project</button>
    ),
  };
});

vi.mock('@/features/project', async () => {
  const actual = await vi.importActual<typeof import('@/features/project')>('@/features/project');
  return {
    ...actual,
    useBudget: () => ({ data: summary, isLoading: false, isError: false, refetch: vi.fn() }),
    useUpsertBudget: () => ({ mutate, isPending: false, isError: false }),
    useFreezeBaseline: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
    useOpenRevision: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
  };
});

vi.mock('@/entities/project', () => ({
  useProjects: () => ({ data: { items: [{ id: 'p1', code: 'PRJ-1', name: 'Alpha', currency: 'IDR' }] } }),
}));

import { BudgetPage } from './budget.page';

const renderPage = async () => {
  renderWithProviders(<BudgetPage />);
  fireEvent.click(screen.getByRole('button', { name: 'pick-project' }));
};

describe('BudgetPage', () => {
  it('renders the cost statement instead of a tree', async () => {
    await renderPage();
    expect(await screen.findByRole('table')).toBeTruthy();
    expect(screen.getByText('Engineering')).toBeTruthy();
  });

  it('names the frozen baseline version', async () => {
    await renderPage();
    await screen.findByRole('table');
    expect(screen.getByText(/v2/)).toBeTruthy();
    expect(screen.getByText(/VO-01/)).toBeTruthy();
  });

  it('opens the inspector inline when a row is selected', async () => {
    await renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /^1\.1\s*Detail Engineering$/ }));
    const panel = screen.getByRole('complementary', { name: /budget detail/i });
    expect(within(panel).getByText('1.1')).toBeTruthy();
  });

  it('sends the chosen cost type when saving, never a bare amount', async () => {
    await renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /^1\.1\s*Detail Engineering$/ }));
    const panel = screen.getByRole('complementary', { name: /budget detail/i });
    const input = within(panel).getByLabelText(/Labor amount/i);
    fireEvent.change(input, { target: { value: '250' } });
    fireEvent.click(within(panel).getByRole('button', { name: /save/i }));
    expect(mutate).toHaveBeenCalledWith({ wbsItemId: 'c1', costType: 'LABOR', amount: 250 });
  });

  it('shows no warning banner when everything is in order', async () => {
    await renderPage();
    await screen.findByRole('table');
    expect(screen.queryByText(/exceeds the contract/i)).toBeNull();
    expect(screen.queryByText(/double count/i)).toBeNull();
  });
});
