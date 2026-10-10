import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSyncExternalStore } from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';

// Router mini: useSearch/useNavigate reaktif agar filter URL benar-benar berpengaruh.
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
  useNavigate: () => (opts: { search?: unknown }) => {
    const next = typeof opts?.search === 'function'
      ? (opts.search as (p: Record<string, unknown>) => Record<string, unknown>)(nav.state.search)
      : opts?.search;
    if (next) nav.set(next as Record<string, unknown>);
  },
  useSearch: () => useSyncExternalStore(nav.subscribe, nav.get, nav.get),
}));

const aging = vi.hoisted(() => ({
  ar: [
    { bucket: 'CURRENT', amount: 88_000_000_000, detail: [] },
    { bucket: '1-30', amount: 0, detail: [] },
    { bucket: '31-60', amount: 18_000_000_000, detail: [
      { invoiceNumber: 'CINV-900111', party: 'PT Klien Utama', projectCode: 'PRJ-1', date: '2026-08-12T00:00:00.000Z', ageDays: 55, outstanding: 18_000_000_000 },
    ] },
    { bucket: '61-90', amount: 0, detail: [] },
    { bucket: '90+', amount: 0, detail: [] },
  ],
  ap: [
    { bucket: 'CURRENT', amount: 82_000_000_000, detail: [] },
    { bucket: '1-30', amount: 0, detail: [] },
    { bucket: '31-60', amount: 0, detail: [] },
    { bucket: '61-90', amount: 0, detail: [] },
    { bucket: '90+', amount: 0, detail: [] },
  ],
}));

vi.mock('@/features/analytics', async () => {
  const actual = await vi.importActual<typeof import('@/features/analytics')>('@/features/analytics');
  return {
    ...actual,
    useCashFlow: vi.fn(() => ({ data: { series: [{ month: '2026-10', cashIn: 100, cashOut: 40, net: 60 }], totalCashIn: 100, totalCashOut: 40, netCash: 60, delta: { totalCashIn: { current: 100, previous: 80, pctChange: 25, direction: 'up' }, totalCashOut: { current: 40, previous: 40, pctChange: 0, direction: 'flat' }, netCash: { current: 60, previous: 40, pctChange: 50, direction: 'up' } }, generatedAt: '2026-10-06T00:00:00.000Z' }, isLoading: false, isError: false, isFetching: false, refetch: vi.fn() })),
    useAging: vi.fn(() => ({ data: { ...aging, arOverdue: 18_000_000_000, apOverdue: 0, delta: { ar: { current: 106_000_000_000, previous: 90_000_000_000, pctChange: 17.8, direction: 'up' }, ap: { current: 82_000_000_000, previous: 82_000_000_000, pctChange: 0, direction: 'flat' }, arOverdue: { current: 18_000_000_000, previous: 10_000_000_000, pctChange: 80, direction: 'up' }, apOverdue: { current: 0, previous: 0, pctChange: null, direction: 'flat' } }, asOf: '2026-10-06T00:00:00.000Z', basisDate: 'invoiceDate', generatedAt: '2026-10-06T00:00:00.000Z' }, isLoading: false, isError: false, refetch: vi.fn() })),
    useProjectCostSummary: vi.fn(() => ({ data: { items: [{ projectCode: 'PRJ-1', projectName: 'Tower', contractValue: 100, budget: 100, cost: 96, revenue: 10, margin: -86, budgetUsagePct: 96 }], generatedAt: 'x' }, isLoading: false, isError: false, refetch: vi.fn() })),
    useCostComposition: vi.fn(() => ({ data: { items: [{ costType: 'MATERIAL', amount: 300 }], total: 300, generatedAt: 'x' }, isLoading: false, isError: false, refetch: vi.fn() })),
    useArConcentration: vi.fn(() => ({ data: { items: [{ client: 'PT Klien Utama', amount: 148, pct: 62.8 }, { client: 'PT Nusantara Energi', amount: 88, pct: 37.2 }], total: 236, generatedAt: 'x' }, isLoading: false, isError: false, refetch: vi.fn() })),
    useForecastVsActual: vi.fn(() => ({ data: { periods: [{ period: '2026-09', forecastNet: 35, actualNet: 44 }], generatedAt: 'x' }, isLoading: false, isError: false, refetch: vi.fn() })),
    exportAnalytics: { aging: vi.fn(), cashFlow: vi.fn(), projectCostSummary: vi.fn() },
  };
});

vi.mock('@/entities/legal-entity', async () => {
  const actual = await vi.importActual<typeof import('@/entities/legal-entity')>('@/entities/legal-entity');
  return { ...actual, useLegalEntities: () => ({ data: { items: [] }, isLoading: false, refetch: vi.fn() }) };
});

import { ReportingPage } from './reporting.page';

beforeEach(() => {
  nav.set({});
});

describe('ReportingPage — struktur & identitas', () => {
  it('states what the report covers', () => {
    renderWithProviders(<ReportingPage />);
    expect(screen.getByRole('heading', { name: 'Advanced Reporting', level: 1 })).toBeTruthy();
    expect(screen.getByText(/Cash flow · aging AR\/AP/i)).toBeTruthy();
  });

  it('shows a headline summary with real totals, not a grid of metric cards', () => {
    renderWithProviders(<ReportingPage />);
    const summary = screen.getByLabelText('Summary');
    expect(within(summary).getByText('AR outstanding')).toBeTruthy();
    expect(within(summary).getByText('AP outstanding')).toBeTruthy();
    expect(within(summary).getByText('Net cash')).toBeTruthy();
    // Total AR = 88M + 18M ditampilkan ringkas, dengan nominal penuh di title.
    const ar = within(summary).getByText('Rp 106 M');
    expect(ar.getAttribute('title')).toMatch(/Rp\s?106\.000\.000\.000/);
  });

  it('shows period-over-period trend badges on the summary cards', () => {
    renderWithProviders(<ReportingPage />);
    const summary = screen.getByLabelText('Summary');
    // AR naik 17,8% vs periode sebelumnya; Net cash naik 50%.
    expect(within(summary).getByText('+17.8%')).toBeTruthy();
    expect(within(summary).getByText('+50%')).toBeTruthy();
  });
});

describe('ReportingPage — aging & drill-down', () => {
  it('renders every aging bucket including zero ones (honest, not hidden)', () => {
    renderWithProviders(<ReportingPage />);
    const ar = screen.getByLabelText('Aging AR');
    // Satu encoding saja (bar per bucket): setiap bucket muncul sebagai baris.
    expect(within(ar).getAllByText('CURRENT').length).toBeGreaterThanOrEqual(1);
    expect(within(ar).getAllByText('31-60').length).toBeGreaterThanOrEqual(1);
    expect(within(ar).getAllByText('90+').length).toBeGreaterThanOrEqual(1);
  });

  it('opens the invoices behind a bucket in a modal, not an always-present block', () => {
    renderWithProviders(<ReportingPage />);
    // Tidak ada blok detail permanen sebelum bucket dipilih.
    expect(screen.queryByText(/Select an aging bucket/i)).toBeNull();
    expect(screen.queryByLabelText('Aging detail')).toBeNull();

    fireEvent.click(screen.getByLabelText('Aging AR 31-60: Rp 18.000.000.000'));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Aging detail · 31-60/)).toBeTruthy();
    expect(within(dialog).getByText('CINV-900111')).toBeTruthy();
    expect(within(dialog).getByText('PT Klien Utama')).toBeTruthy();
  });
});

describe('ReportingPage — blok lain', () => {
  it('shows AR concentration ranked by client with share', () => {
    renderWithProviders(<ReportingPage />);
    expect(screen.getByText('AR concentration')).toBeTruthy();
    expect(screen.getByText('PT Klien Utama')).toBeTruthy();
    expect(screen.getByText('62.8%')).toBeTruthy();
  });

  it('labels the project cost table with the budget-usage framing', () => {
    renderWithProviders(<ReportingPage />);
    expect(screen.getByText(/Budget used per project/i)).toBeTruthy();
    expect(screen.getByText(/margin = revenue − cost/i)).toBeTruthy();
  });

  it('shows the project table with a search box and in-cell budget bar (no separate bar list)', () => {
    const { container } = renderWithProviders(<ReportingPage />);
    expect(screen.getByLabelText('Search projects')).toBeTruthy();
    expect(container.querySelector('[data-slot="budget-usage-fill"]')).toBeTruthy();
  });

  it('shows forecast vs actual and cost composition', () => {
    renderWithProviders(<ReportingPage />);
    expect(screen.getByText('Forecast vs actual')).toBeTruthy();
    expect(screen.getByText('Cost composition')).toBeTruthy();
  });
});

describe('ReportingPage — filter', () => {
  it('writes the selected period to the URL', () => {
    renderWithProviders(<ReportingPage />);
    fireEvent.click(screen.getByRole('radio', { name: 'MTD' }));
    expect(nav.get().period).toBe('MTD');
  });

  it('passes the active period range into the data hooks (not just the URL)', async () => {
    nav.set({ period: 'YTD' });
    const mod = await import('@/features/analytics');
    renderWithProviders(<ReportingPage />);
    const expectedFrom = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1)).toISOString().slice(0, 10);
    const cashCalls = (mod.useCashFlow as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    expect(cashCalls.at(-1)?.[0]).toMatchObject({ from: expectedFrom });
    const agingCalls = (mod.useAging as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    expect(agingCalls.at(-1)?.[0]).toMatchObject({ from: expectedFrom });
  });
});
