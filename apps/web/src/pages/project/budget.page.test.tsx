import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';

const withBudget = vi.hoisted(() => ({
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

/** Proyek tanpa alokasi sama sekali, seperti PRJ-030. */
const noBudget = vi.hoisted(() => ({
  projectId: 'p1',
  currency: 'IDR',
  baseline: null,
  versions: [],
  openRevision: false,
  rows: [
    { id: 'w1', code: '1', name: 'Engineering', parentId: null, depth: 0, childrenCount: 0, baseline: 0, revised: 0, committed: 0, actual: 0, available: 0, variance: 0, varianceBaseline: 0, byCostType: {} },
    { id: 'w2', code: '2', name: 'Procurement', parentId: null, depth: 0, childrenCount: 0, baseline: 0, revised: 0, committed: 0, actual: 900_000_000, available: 0, variance: -900_000_000, varianceBaseline: 0, byCostType: {} },
  ],
  totals: { baseline: 0, revised: 0, committed: 0, actual: 900_000_000, available: 0, variance: -900_000_000, varianceBaseline: 0, contractValue: 45_000_000_000, eac: null, vac: null },
  composition: [],
  unallocated: { committed: 0, actual: 0 },
  reconciliation: { ledgerOut: 900_000_000, journalExpense610: 0, doubleCountRisk: false },
  warnings: {
    overContract: false,
    overCommitted: [],
    noBudget: [{ wbsId: 'w1', code: '1' }, { wbsId: 'w2', code: '2' }],
    pvCoverage: { pv: 0, bac: 0, status: 'NO_BASELINE' },
  },
  costCoverage: { allocatedNodes: 1, totalNodes: 2 },
}));

const mutate = vi.hoisted(() => vi.fn());
const state = vi.hoisted(() => ({ payload: null as unknown }));

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
    useBudget: () => ({ data: state.payload, isLoading: false, isError: false, refetch: vi.fn() }),
    useUpsertBudget: () => ({ mutate, isPending: false, isError: false }),
    useFreezeBaseline: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
    useOpenRevision: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
  };
});

vi.mock('@/entities/project', () => ({
  useProjects: () => ({ data: { items: [{ id: 'p1', code: 'PRJ-1', name: 'Alpha', currency: 'IDR' }] } }),
}));

import { BudgetPage } from './budget.page';

const renderPage = async (payload: unknown) => {
  state.payload = payload;
  renderWithProviders(<BudgetPage />);
  fireEvent.click(screen.getByRole('button', { name: 'pick-project' }));
};

describe('BudgetPage — shell', () => {
  it('uses the project name as the page heading, not a generic label', async () => {
    await renderPage(withBudget);
    const heading = await screen.findByRole('heading', { level: 1 });
    expect(heading.textContent).toBe('Alpha');
  });

  it('drops the decorative subtitle', async () => {
    await renderPage(withBudget);
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByText(/commitment and actual cost per wbs/i)).toBeNull();
  });

  it('asks for a project before showing anything', () => {
    state.payload = null;
    renderWithProviders(<BudgetPage />);
    expect(screen.getByText(/select a project to see its cost position/i)).toBeTruthy();
  });
});

describe('BudgetPage — with a baseline', () => {
  it('leads with the money position', async () => {
    await renderPage(withBudget);
    const region = await screen.findByLabelText('Money position');
    expect(within(region).getByTestId('money-revised')).toBeTruthy();
  });

  it('renders statement, composition and history', async () => {
    await renderPage(withBudget);
    expect(await screen.findByRole('table')).toBeTruthy();
    expect(screen.getByLabelText('Cost composition')).toBeTruthy();
    expect(screen.getByLabelText('Baseline history')).toBeTruthy();
  });

  it('opens the inspector inline when a row is selected', async () => {
    await renderPage(withBudget);
    fireEvent.click(await screen.findByRole('button', { name: /^1\.1\s*Detail Engineering$/ }));
    const panel = screen.getByRole('complementary', { name: /budget detail/i });
    expect(within(panel).getByText('1.1')).toBeTruthy();
  });

  it('sends the chosen cost type when saving', async () => {
    await renderPage(withBudget);
    fireEvent.click(await screen.findByRole('button', { name: /^1\.1\s*Detail Engineering$/ }));
    const panel = screen.getByRole('complementary', { name: /budget detail/i });
    fireEvent.change(within(panel).getByLabelText(/Labor amount/i), { target: { value: '250' } });
    fireEvent.click(within(panel).getByRole('button', { name: /save/i }));
    expect(mutate).toHaveBeenCalledWith({ wbsItemId: 'c1', costType: 'LABOR', amount: 250 });
  });
});

describe('BudgetPage — no budget allocated', () => {
  it('collapses to a single calm panel instead of five empty zones', async () => {
    await renderPage(noBudget);
    expect(await screen.findByLabelText('No budget allocated')).toBeTruthy();
    expect(screen.queryByLabelText('Money position')).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByLabelText('Cost composition')).toBeNull();
    expect(screen.queryByLabelText('Baseline history')).toBeNull();
  });

  it('still reports the actual spend that was booked', async () => {
    await renderPage(noBudget);
    const panel = await screen.findByLabelText('No budget allocated');
    expect(panel.textContent).toMatch(/900\.000\.000/);
  });

  it('does not promise a freeze action that is not offered', async () => {
    await renderPage(noBudget);
    const panel = await screen.findByLabelText('No budget allocated');
    expect(panel.textContent).not.toMatch(/freeze it here/i);
  });

  it('does not nag about nodes without budget when nothing is allocated at all', async () => {
    await renderPage(noBudget);
    await screen.findByLabelText('No budget allocated');
    expect(screen.queryByLabelText('Needs attention')).toBeNull();
    expect(screen.queryByText(/nodes without budget/i)).toBeNull();
  });

  it('offers no freeze action, because there is nothing to freeze', async () => {
    await renderPage(noBudget);
    await screen.findByLabelText('No budget allocated');
    expect(screen.queryByRole('button', { name: /freeze/i })).toBeNull();
  });
});
