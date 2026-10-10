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
    // Total AR = 88M + 18M
    expect(within(summary).getByText(/Rp\s?106\.000\.000\.000/)).toBeTruthy();
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
    // Nama bucket muncul di legend stacked bar DAN baris bucket — keduanya wajar.
    expect(within(ar).getAllByText('CURRENT').length).toBeGreaterThanOrEqual(1);
    expect(within(ar).getAllByText('31-60').length).toBeGreaterThanOrEqual(1);
    expect(within(ar).getAllByText('90+').length).toBeGreaterThanOrEqual(1);
  });

  it('reveals the invoices behind a bucket when it is clicked', () => {
    renderWithProviders(<ReportingPage />);
    // Sebelum memilih: panduan, bukan tabel kosong.
    expect(screen.getByText(/Select an aging bucket/i)).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Aging AR 31-60: Rp 18.000.000.000'));

    const detail = screen.getByLabelText('Aging detail');
    expect(within(detail).getByText('CINV-900111')).toBeTruthy();
    expect(within(detail).getByText('PT Klien Utama')).toBeTruthy();
    expect(screen.queryByText(/Select an aging bucket/i)).toBeNull();
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

  it('shows forecast vs actual and cost composition', () => {
    renderWithProviders(<ReportingPage />);
    expect(screen.getByText('Forecast vs actual')).toBeTruthy();
    expect(screen.getByText('Cost composition')).toBeTruthy();
  });

  it('anchors the scrollable cost table so its sr-only caption cannot escape', () => {
    const { container } = renderWithProviders(<ReportingPage />);
    const caption = container.querySelector('caption.sr-only')!;
    expect(caption).toBeTruthy();
    const wrapper = caption.closest('div')!;
    // `<caption className="sr-only">` memakai `position: absolute`. Tanpa leluhur
    // ber-position, containing block-nya jatuh ke <body>, sehingga caption lolos
    // dari `overflow-y: auto` milik <main> dan menambah ~1260px ruang kosong di
    // bawah halaman. `relative` mengurungnya kembali.
    expect(wrapper.className).toContain('relative');
    expect(wrapper.className).toContain('overflow-x-auto');
  });

  it('keeps the caption inside the scroll container rather than directly under the page', () => {
    const { container } = renderWithProviders(<ReportingPage />);
    const caption = container.querySelector('caption.sr-only')!;
    expect(caption.tagName).toBe('CAPTION');
    const wrapper = container.querySelector('div.relative.overflow-x-auto');
    expect(wrapper).toBeTruthy();
    expect(wrapper!.contains(caption)).toBe(true);
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
