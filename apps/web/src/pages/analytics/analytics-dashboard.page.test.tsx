import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';

const state = vi.hoisted(() => ({ compare: undefined as string | undefined }));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/features/project', () => ({
  usePortfolio: () => ({
    data: { healthCounts: { ON_TRACK: 8, AT_RISK: 3, CRITICAL: 2, NO_BUDGET: 1 }, totals: { projectCount: 14 }, items: [] },
    isLoading: false,
  }),
}));

vi.mock('@/features/analytics', async () => {
  const actual = await vi.importActual<typeof import('@/features/analytics')>('@/features/analytics');
  return {
    ...actual,
    useExecutiveDashboard: (_filter?: unknown, opts?: { compare?: string }) => {
      state.compare = opts?.compare;
      return {
        data: {
          projects: { total: 12, byStatus: { ACTIVE: 8, PLANNING: 3, CLOSED: 1 }, totalContractValue: 84_200_000_000, totalAdvance: 3_000_000_000 },
          finance: { totalBudget: 61_000_000_000, postedVendorInvoice: 12_300_000_000, postedClientInvoice: 20_100_000_000, cashIn: 20_100_000_000, cashOut: 12_300_000_000 },
          operational: { openClaims: 5, openNcrs: 2, openIncidents: 1, overduePm: 0, openPunchItems: 0 },
          trend: {
            cashIn: [{ month: '2026-05', value: 1 }, { month: '2026-06', value: 2 }],
            cashOut: [{ month: '2026-05', value: 1 }, { month: '2026-06', value: 1 }],
            newProjects: [{ month: '2026-05', value: 1 }, { month: '2026-06', value: 2 }],
            newBudget: [{ month: '2026-05', value: 1 }, { month: '2026-06', value: 3 }],
            newNcrs: [{ month: '2026-05', value: 1 }, { month: '2026-06', value: 0 }],
            newIncidents: [{ month: '2026-05', value: 0 }, { month: '2026-06', value: 1 }],
          },
          delta: {
            'projects.total': { current: 12, previous: 10, pctChange: 20, direction: 'up' as const },
            'finance.cashIn': { current: 20, previous: 18, pctChange: 11.1, direction: 'up' as const },
          },
          generatedAt: '2026-10-06T05:34:00.000Z',
        },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      };
    },
    useAnomalies: () => ({
      data: {
        total: 3,
        anomalies: [
          { type: 'BUDGET_OVERRUN', severity: 'HIGH' as const, projectCode: 'PRJ-01', message: 'Budget 118% of contract' },
          { type: 'PM_OVERDUE', severity: 'MEDIUM' as const, message: '2 PM schedule(s) past due' },
          { type: 'CLAIMS_DRAFT_BACKLOG', severity: 'LOW' as const, message: '3 claim(s) still DRAFT' },
        ],
      },
      isLoading: false,
    }),
  };
});

import { AnalyticsDashboardPage } from './analytics-dashboard.page';

describe('AnalyticsDashboardPage', () => {
  it('requests the previous period so deltas are actually sent by the API', () => {
    state.compare = undefined;
    renderWithProviders(<AnalyticsDashboardPage />);
    expect(state.compare).toBe('previous');
  });

  it('does not leak internal phase jargon into the UI', () => {
    const { container } = renderWithProviders(<AnalyticsDashboardPage />);
    expect(container.textContent).not.toMatch(/Phase 10/i);
    expect(container.textContent).not.toMatch(/advisory/i);
  });

  it('renders metric rows as links to the related page (drill-down)', () => {
    renderWithProviders(<AnalyticsDashboardPage />);
    const link = screen.getByRole('link', { name: /Contract value/i });
    expect(link.getAttribute('href')).toBe('/commercial');
  });

  it('renders metric rows without per-row card chrome (no border+shadow per metric)', () => {
    const { container } = renderWithProviders(<AnalyticsDashboardPage />);
    const rows = Array.from(container.querySelectorAll('[data-slot="metric-row"]'));
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.className).not.toMatch(/shadow-/);
      expect(row.className).not.toMatch(/\bborder\b(?!-)/);
    }
  });

  it('shows a sparkline only where a real series exists', () => {
    const { container } = renderWithProviders(<AnalyticsDashboardPage />);
    // Contract value tidak punya seri di API → tidak boleh ada sparkline karangan.
    const contractRow = screen.getByRole('link', { name: /Contract value/i });
    expect(contractRow.querySelector('[data-slot="metric-spark"] svg')).toBeNull();
    // Cash in punya seri nyata → ada sparkline.
    const cashRow = screen.getByRole('link', { name: /Cash in/i });
    expect(cashRow.querySelector('[data-slot="metric-spark"] svg')).not.toBeNull();
    // Total sparkline = metrik yang punya seri nyata: 4 financial + 2 operational.
    expect(container.querySelectorAll('[data-slot="metric-spark"] svg').length).toBe(6);
  });

  it('labels flow-derived operational trends honestly (per month, not open stock)', () => {
    renderWithProviders(<AnalyticsDashboardPage />);
    expect(screen.getByText(/New NCRs \/ mo/i)).toBeTruthy();
    expect(screen.queryByText(/^Open NCRs$/i)).toBeNull();
  });

  it('shows a dash instead of a fake delta for snapshot metrics', () => {
    renderWithProviders(<AnalyticsDashboardPage />);
    const pmRow = screen.getByRole('link', { name: /Overdue PM/i });
    // Snapshot metric: tidak ada badge delta (tak ada panah naik/turun) — hanya "—".
    expect(pmRow.querySelector('[data-slot="stat-delta"], [aria-label="up"], [aria-label="down"]')).toBeNull();
    expect(pmRow.textContent).toMatch(/—/);
  });

  it('renders the portfolio health as a segmented bar', () => {
    const { container } = renderWithProviders(<AnalyticsDashboardPage />);
    const bar = container.querySelector('[data-slot="health-bar"]');
    expect(bar).not.toBeNull();
    expect(bar?.getAttribute('aria-label')).toMatch(/on track/i);
  });

  it('filters anomalies by severity when a chip is clicked', () => {
    renderWithProviders(<AnalyticsDashboardPage />);
    fireEvent.click(screen.getByRole('button', { name: /High/i }));
    expect(screen.getByText(/Budget 118% of contract/i)).toBeTruthy();
    expect(screen.queryByText(/2 PM schedule\(s\) past due/i)).toBeNull();
  });
});
