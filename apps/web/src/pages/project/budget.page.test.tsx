import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';

const summary = vi.hoisted(() => ({
  projectId: 'p1',
  status: 'DRAFT',
  wbs: [
    { id: 'p', code: '1', name: 'Engineering', parentId: null, depth: 0, budget: 400, used: 40, remaining: 360, byCostType: { LABOR: 400 }, plannedValue: 0, itemCount: 1, childrenCount: 1 },
    { id: 'c1', code: '1.1', name: 'Detail Engineering', parentId: 'p', depth: 1, budget: 400, used: 40, remaining: 360, byCostType: { LABOR: 400 }, plannedValue: 0, itemCount: 1, childrenCount: 0 },
  ],
  totalBudget: 400,
  totals: { budget: 400, used: 40, remaining: 360, contractValue: 1000, variance: 600 },
  warnings: { overContract: false, overAllocated: [], noBudget: [], pvMismatch: null },
  costCoverage: { allocatedNodes: 1, totalNodes: 2 },
}));

const mutate = vi.hoisted(() => vi.fn());

// `EntitySelect` adalah combobox Radix yang butuh interaksi pointer kompleks di
// jsdom. Untuk menguji halaman (bukan komponen pihak ketiga), ia diganti tombol
// sederhana yang memilih proyek pertama — persis efek yang diharapkan halaman.
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
    usePublishBudget: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
  };
});

// Halaman mengambil daftar proyek dari `@/entities/project`, bukan `@/features/project`.
vi.mock('@/entities/project', () => ({
  useProjects: () => ({ data: { items: [{ id: 'p1', code: 'PRJ-1', name: 'Alpha', currency: 'IDR' }] } }),
}));

import { BudgetPage } from './budget.page';

/** Pilih proyek lebih dulu — halaman memang menunggu pemilihan sebelum memuat budget. */
const renderPage = async () => {
  renderWithProviders(<BudgetPage />);
  fireEvent.click(screen.getByRole('button', { name: 'pick-project' }));
};

describe('BudgetPage', () => {
  it('renders the tree, the totals and the coverage note', async () => {
    await renderPage();
    expect(await screen.findByText('Engineering')).toBeTruthy();
    expect(screen.getByText(/1 of 2 nodes have allocated spend/i)).toBeTruthy();
  });

  it('shows the inspector for the selected node with its cost breakdown', async () => {
    await renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /^1\.1\s*Detail Engineering$/ }));
    const panel = screen.getByRole('complementary', { name: /budget detail/i });
    // "Labor" muncul dua kali: sebagai label rincian (<dt>) dan sebagai <option> di form.
    const breakdown = within(panel).getByRole('region', { name: /cost breakdown/i });
    expect(within(breakdown).getByText('Labor')).toBeTruthy();
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
    await screen.findByText('Engineering');
    expect(screen.queryByText(/exceeds contract/i)).toBeNull();
    expect(screen.queryByText(/baseline PV/i)).toBeNull();
  });
});
