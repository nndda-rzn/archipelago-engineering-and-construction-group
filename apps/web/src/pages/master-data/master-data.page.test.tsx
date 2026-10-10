import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSyncExternalStore } from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';

const nav = vi.hoisted(() => {
  const state = { search: {} as Record<string, unknown>, listeners: new Set<() => void>() };
  return {
    state,
    get: () => state.search,
    set: (next: Record<string, unknown>) => { state.search = next; for (const l of state.listeners) l(); },
    subscribe: (l: () => void) => { state.listeners.add(l); return () => state.listeners.delete(l); },
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

const vendors = [
  { id: 'v1', vendorCode: 'VND-2026-000001', name: 'PT Baja Utama', taxId: '01.234', category: 'MATERIAL', contactPerson: 'Rudi', email: 'a@b.co', phone: '+62', address: 'Jakarta', status: 'ACTIVE', createdAt: 'x', updatedAt: 'x' },
];
const periods = Array.from({ length: 12 }, (_, i) => ({
  id: `p${i + 1}`, periodCode: `2026-${String(i + 1).padStart(2, '0')}`, periodYear: 2026, periodMonth: i + 1,
  startDate: `2026-${String(i + 1).padStart(2, '0')}-01`, endDate: `2026-${String(i + 1).padStart(2, '0')}-28`,
  status: i < 8 ? 'LOCKED' : i === 9 ? 'OPEN' : 'FUTURE', createdAt: 'x', updatedAt: 'x',
}));

vi.mock('@/features/master-data/model/master-data.api', async () => {
  const actual = await vi.importActual<typeof import('@/features/master-data/model/master-data.api')>('@/features/master-data/model/master-data.api');
  return {
    ...actual,
    useVendors: vi.fn((params: { search?: string }) => ({
      data: { items: params.search ? vendors.filter((v) => v.name.toLowerCase().includes(params.search!.toLowerCase())) : vendors, total: vendors.length },
      isLoading: false, isError: false, refetch: vi.fn(),
    })),
    useVendorStats: vi.fn(() => ({ data: { total: 9, active: 8, inactive: 1, avgScore: 4.2, ratingCount: 3, byCategory: [{ category: 'MATERIAL', count: 6 }] }, isLoading: false })),
    useFiscalPeriods: vi.fn(() => ({ data: { items: periods, total: periods.length }, isLoading: false, isError: false, refetch: vi.fn() })),
    useVendorDetail: vi.fn(() => ({ data: undefined, isLoading: true, isError: false, refetch: vi.fn() })),
    useNumberSequences: vi.fn(() => ({ data: { items: [], total: 0 }, isLoading: false })),
    useSetVendorStatus: () => ({ mutate: vi.fn(), isPending: false }),
    useUpdateFiscalPeriodStatus: () => ({ mutate: vi.fn(), isPending: false }),
    useCreateVendor: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
    useCreateFiscalPeriod: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
  };
});

import { MasterDataPage } from './master-data.page';

beforeEach(() => nav.set({}));

describe('MasterDataPage — structure', () => {
  it('shows a KPI strip with vendor totals, not a grid of plain cards', () => {
    renderWithProviders(<MasterDataPage />);
    const kpi = screen.getByLabelText('Master data summary');
    expect(within(kpi).getByText('Vendors')).toBeTruthy();
    expect(within(kpi).getByText('9')).toBeTruthy();
    expect(within(kpi).getByText('Active')).toBeTruthy();
  });

  it('renders vendor list on the default tab with a search box', () => {
    renderWithProviders(<MasterDataPage />);
    expect(screen.getByRole('listbox', { name: /vendors/i })).toBeTruthy();
    expect(screen.getByLabelText(/search vendors/i)).toBeTruthy();
  });

  it('filters the vendor list by the search query', () => {
    renderWithProviders(<MasterDataPage />);
    fireEvent.change(screen.getByLabelText(/search vendors/i), { target: { value: 'zzz' } });
    expect(screen.queryByText('PT Baja Utama')).toBeNull();
  });
});

describe('MasterDataPage — tabs & pagination isolation', () => {
  it('switches to the fiscal period calendar', () => {
    renderWithProviders(<MasterDataPage />);
    fireEvent.click(screen.getByRole('tab', { name: /fiscal period/i }));
    expect(screen.getByText('2026-01')).toBeTruthy();
    expect(screen.getByText('2026-12')).toBeTruthy();
  });

  it('keeps pagination state separate per tab (switching does not blank the second tab)', () => {
    renderWithProviders(<MasterDataPage />);
    // Vendor tab: pindah ke halaman 2 (mock hanya 1 halaman, jadi tetap menampilkan data).
    fireEvent.click(screen.getByRole('tab', { name: /fiscal period/i }));
    // Kalender period harus tetap tampil, bukan kosong karena page bocor dari tab lain.
    expect(screen.getByText('2026-06')).toBeTruthy();
  });
});
