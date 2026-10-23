import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';

const summary = vi.hoisted(() => ({
  projectId: 'p1',
  currency: 'IDR',
  baseline: { id: 'b2', version: 2, status: 'FROZEN', label: 'VO-01', reason: null, frozenAt: '2026-10-22T00:00:00.000Z', total: 400 },
  versions: [
    { id: 'b2', version: 2, status: 'FROZEN', label: 'VO-01', reason: null, frozenAt: '2026-10-22T00:00:00.000Z', total: 400 },
    { id: 'b1', version: 1, status: 'FROZEN', label: 'Original', reason: null, frozenAt: '2026-01-15T00:00:00.000Z', total: 380 },
  ],
  openRevision: true,
  rows: [
    { id: 'p', code: '1', name: 'Engineering', parentId: null, depth: 0, childrenCount: 1, baseline: 400, revised: 450, committed: 100, actual: 40, available: 310, variance: 410, varianceBaseline: 50, byCostType: { LABOR: 450 } },
    { id: 'c1', code: '1.1', name: 'Detail Engineering', parentId: 'p', depth: 1, childrenCount: 0, baseline: 400, revised: 450, committed: 100, actual: 40, available: 310, variance: 410, varianceBaseline: 50, byCostType: { LABOR: 450 } },
  ],
  totals: { baseline: 400, revised: 450, committed: 100, actual: 40, available: 310, variance: 410, varianceBaseline: 50, contractValue: 1000, eac: 470, vac: -20 },
  composition: [{ costType: 'LABOR', amount: 450 }],
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
  it('asks for a project before showing anything', () => {
    renderWithProviders(<BudgetPage />);
    expect(screen.getByText(/select a project to see its cost position/i)).toBeTruthy();
  });

  it('leads with the money position, not the table', async () => {
    await renderPage();
    const region = await screen.findByLabelText('Money position');
    expect(region).toBeTruthy();
    // Angka Revised adalah elemen dominan halaman.
    expect(within(region).getByTestId('money-revised')).toBeTruthy();
  });

  it('names the project and the frozen version in the document band', async () => {
    await renderPage();
    expect(await screen.findByText('Alpha')).toBeTruthy();
    const band = screen.getByRole('banner');
    expect(within(band).getByText(/v2/)).toBeTruthy();
    expect(within(band).getByText(/VO-01/)).toBeTruthy();
  });

  it('renders the statement, the composition and the history', async () => {
    await renderPage();
    expect(await screen.findByRole('table')).toBeTruthy();
    expect(screen.getByLabelText('Cost composition')).toBeTruthy();
    expect(screen.getByLabelText('Baseline history')).toBeTruthy();
  });

  it('shows both versions in the history', async () => {
    await renderPage();
    await screen.findByLabelText('Baseline history');
    expect(screen.getByTestId('version-b2')).toBeTruthy();
    expect(screen.getByTestId('version-b1')).toBeTruthy();
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

  it('hides the attention strip when nothing needs action', async () => {
    await renderPage();
    await screen.findByRole('table');
    expect(screen.queryByLabelText('Needs attention')).toBeNull();
  });
});
