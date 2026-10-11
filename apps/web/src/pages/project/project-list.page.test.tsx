import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSyncExternalStore } from 'react';
import { act } from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';

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
    setSearch: vi.fn(),
  };
});

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, ...rest }: { children: React.ReactNode; to: string; params?: Record<string, string> }) => {
    let href = to;
    if (params) for (const [k, v] of Object.entries(params)) href = href.replace(`$${k}`, String(v));
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  },
  // Store reaktif mini: meniru `navigate({ search })` + `useSearch()` router nyata
  // sehingga perubahan filter/view benar-benar memicu render ulang.
  useNavigate: () => (opts: { search?: unknown }) => {
    const next = typeof opts?.search === 'function'
      ? (opts.search as (p: Record<string, unknown>) => Record<string, unknown>)(nav.state.search)
      : opts?.search;
    if (next) nav.set(next as Record<string, unknown>);
    nav.setSearch(opts);
  },
  useSearch: () => useSyncExternalStore(nav.subscribe, nav.get, nav.get),
}));

const register = vi.hoisted(() => ({
  items: [
    { projectId: 'p1', code: 'PRJ-01', name: 'Alpha EPC', client: 'PT Klien', manager: 'Andi', status: 'ACTIVE', contractValue: 100_000_000, startDate: '2026-01-01T00:00:00.000Z', completionDate: '2027-01-01T00:00:00.000Z', budget: 80_000_000, actual: 60_000_000, variance: 20_000_000, utilization: 75, health: 'AT_RISK' as const, phase: 'CONSTRUCTION', healthStatus: 'AT_RISK', progressPlanned: 55, progressActual: 48, cpi: 0.98, spi: 0.87, openRisks: 3, openNcr: 1, openHse: 1, nextMilestone: { name: 'Handover', plannedDate: '2027-01-01T00:00:00.000Z', isCritical: true }, trend: [10, 30, 60, 100], teamCount: 2, team: [{ id: 'e1', name: 'Andi', position: 'PM', isKeyMember: true }], tagline: 'EPC fasilitas pengolahan', isWatchlist: true, watchlistReason: 'Behind schedule', type: 'EPC', priority: 'HIGH', managerRef: { id: 'e1', name: 'Andi Pratama', position: 'PM' }, directorRef: null },
    { projectId: 'p2', code: 'PRJ-02', name: 'Beta Pipeline', client: 'PT Utama', manager: null, status: 'PLANNING', contractValue: 50_000_000, startDate: null, completionDate: null, budget: 0, actual: 0, variance: 0, utilization: null, health: 'NO_BUDGET' as const, phase: 'INITIATION', healthStatus: 'ON_TRACK', progressPlanned: 0, progressActual: 0, cpi: null, spi: null, openRisks: 0, openNcr: 0, openHse: 0, nextMilestone: null, trend: [], teamCount: 0, team: [], tagline: null, isWatchlist: false, watchlistReason: null, type: 'OTHER', priority: 'MEDIUM', managerRef: null, directorRef: null },
  ],
}));

vi.mock('@/entities/project', async () => {
  const actual = await vi.importActual<typeof import('@/entities/project')>('@/entities/project');
  return {
    ...actual,
    useProjectRegister: () => ({
      data: {
        items: register.items,
        totals: { projectCount: 2, totalContract: 150_000_000, totalBudget: 80_000_000, totalActual: 60_000_000, totalVariance: 20_000_000 },
        healthCounts: { NO_BUDGET: 1, ON_TRACK: 0, AT_RISK: 1, CRITICAL: 0 },
        generatedAt: '2026-10-06T00:00:00.000Z',
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }),
  };
});

vi.mock('@/features/project/ui', async () => {
  const actual = await vi.importActual<typeof import('@/features/project/ui')>('@/features/project/ui');
  return { ...actual, ProjectForm: () => <div data-testid="project-form" /> };
});

import { ProjectListPage } from './project-list.page';

const viewOptions = () => screen.getByRole('radiogroup', { name: /view/i });

beforeEach(() => {
  // State URL bersifat module-level (meniru router); reset antar-test agar
  // view/filter dari test sebelumnya tidak bocor.
  nav.set({});
  nav.setSearch.mockClear();
});

describe('ProjectListPage — 3 view', () => {
  it('renders a summary bar from the register totals', () => {
    renderWithProviders(<ProjectListPage />);
    expect(screen.getByText(/2 projects/i)).toBeTruthy();
    expect(screen.getByText(/Rp\s?150\.000\.000/)).toBeTruthy();
  });

  it('offers Table / Card / Timeline views', () => {
    renderWithProviders(<ProjectListPage />);
    const group = viewOptions();
    expect(within(group).getByRole('radio', { name: /tabel|table/i })).toBeTruthy();
    expect(within(group).getByRole('radio', { name: /kartu|card/i })).toBeTruthy();
    expect(within(group).getByRole('radio', { name: /timeline/i })).toBeTruthy();
  });

  it('defaults to the table view and links each row to the project detail', () => {
    renderWithProviders(<ProjectListPage />);
    const link = screen.getByRole('link', { name: /PRJ-01/ });
    expect(link.getAttribute('href')).toBe('/projects/p1');
  });

  it('switching to the card view keeps the same data (no refetch, same records)', () => {
    renderWithProviders(<ProjectListPage />);
    fireEvent.click(within(viewOptions()).getByRole('radio', { name: /kartu|card/i }));
    expect(screen.getByRole('link', { name: /Beta Pipeline/ })).toBeTruthy();
  });

  it('writes the selected view to the URL', () => {
    renderWithProviders(<ProjectListPage />);
    fireEvent.click(within(viewOptions()).getByRole('radio', { name: /timeline/i }));
    // `useUrlFilter` menulis ke search params router — periksa state URL hasilnya.
    expect(nav.get().view).toBe('timeline');
  });

  it('labels cost consumption as "Budget used" in the table, and shows CPI on the card', () => {
    renderWithProviders(<ProjectListPage />);
    // Tabel memakai istilah jujur "Budget used".
    expect(screen.getAllByText(/Budget used/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/^Utilization$/i)).toBeNull();
    // Kartu memakai sinyal triage (CPI), bukan sekadar mengulang kolom tabel.
    fireEvent.click(within(viewOptions()).getByRole('radio', { name: /kartu|card/i }));
    expect(screen.getAllByText(/CPI/).length).toBeGreaterThan(0);
    expect(screen.getByText('Needs attention')).toBeTruthy();
  });

  it('groups projects without dates instead of drawing a bogus bar', () => {
    renderWithProviders(<ProjectListPage />);
    fireEvent.click(within(viewOptions()).getByRole('radio', { name: /timeline/i }));
    expect(screen.getByText(/without dates/i)).toBeTruthy();
  });

  it('distinguishes an empty filter result from having no projects at all', () => {
    renderWithProviders(<ProjectListPage />);
    // Isi filter yang tidak cocok → pesan "No projects match" + Clear filters
    // (bukan "No projects yet" yang mengajak membuat proyek).
    act(() => {
      fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'zzz-nonexistent' } });
    });
    expect(screen.getByText(/No projects match/i)).toBeTruthy();
    // Dua jalan keluar memang disediakan: di baris chip dan di empty state.
    expect(screen.getAllByRole('button', { name: /Clear filters/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/No projects yet/i)).toBeNull();
  });
});
