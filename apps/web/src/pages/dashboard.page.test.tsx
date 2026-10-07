import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useNavigate: () => vi.fn(),
  useSearch: () => ({}),
}));
vi.mock('@/widgets/dashboard-filter-bar', () => ({
  useDashboardFilter: () => ({ filter: {}, preset: 'YTD', entityId: '', setPreset: vi.fn(), setEntity: vi.fn() }),
  DashboardFilterBar: () => <div data-testid="filter-bar" />,
}));
vi.mock('@/entities/legal-entity', () => ({
  useLegalEntities: () => ({ data: { items: [] } }),
}));
vi.mock('@/widgets/anomaly-triage', () => ({ AnomalyTriage: () => <div data-testid="triage" /> }));

// Control Tower data hook: dikendalikan per-test.
const ct = vi.hoisted(() => ({ state: { data: undefined as unknown, isLoading: false, isError: false, refetch: vi.fn() } }));
vi.mock('@/features/analytics', async () => {
  const actual = await vi.importActual<typeof import('@/features/analytics')>('@/features/analytics');
  return {
    ...actual,
    useControlTower: () => ct.state,
    useCashFlow: () => ({ data: { series: [] }, isLoading: false, isError: false }),
    useLiveAnalytics: () => ({ enabled: true, connected: true, lastChangeAt: null, setEnabled: vi.fn() }),
  };
});

const perms = vi.hoisted(() => ({ can: (() => true) as (code: string) => boolean }));
vi.mock('@/entities/session', () => ({
  usePermissions: () => ({ set: new Set(), can: perms.can, canAny: () => true }),
}));

const sampleTower = {
  kpis: [
    { key: 'cash', label: 'Cash on hand', value: 18240500000, unit: 'idr', target: 15000000000, direction: 'MIN', attainmentPct: 121.6, meetsTarget: true },
    { key: 'netCashFlow', label: 'Net cash flow', value: 420000000, unit: 'idr', target: 500000000, direction: 'MIN', attainmentPct: 84, meetsTarget: false },
  ],
  exceptions: { bySeverity: { HIGH: 1, MEDIUM: 0, LOW: 0 }, items: [{ key: 'a', severity: 'HIGH', type: 'Approval SLA', documentCode: 'PO-1', domain: 'Procurement', ageDays: 9, slaDays: 5, overdue: true, to: '/approvals' }], total: 1 },
  projects: [{ projectId: 'p1', projectCode: 'PRJ-1', projectName: 'Ring Road', client: 'X', health: 'ON_TRACK', contractValue: 100, budget: 80, actual: 40, variance: 40, revenue: 0, utilization: 40, progressPct: 50, cpi: null, spi: null, hasEvm: false, riskScore: 4 }],
  projectTotals: { count: 1, contractValue: 100, budget: 80, actual: 40, variance: 40 },
  operations: {
    procurement: { openPoValue: 100, openPoCount: 1, pendingPrCount: 0, rfqDueCount: 0, avgVendorScore: 4, topVendorName: 'X', topVendorScore: 4 },
    safety: { openIncidents: 1, highSeverityOpen: 0, openCorrectiveActions: 0, overdueCorrectiveActions: 0, trir: 0.24, daysSinceLastIncident: 1 },
    quality: { openNcrs: 2, criticalNcrs: 0, openPunchItems: 0 },
    hcm: { activeEmployees: 2, manpowerToday: 1240, pendingTimesheets: 0, equipmentUtilizationPct: 80, openBreakdowns: 0 },
    inventory: { stockValue: 1_200_000_000, warehouseCount: 3, negativeBalanceCount: 1, movementInValue: 2_000_000_000, movementOutValue: 800_000_000 },
  },
  governance: { openRisks: 5, highRisks: 1, overdueAuditFindings: 0, openLegalCases: 0, riskMatrix: [] },
  commercial: { pipelineValue: 0, openOpportunities: 0, wonValue: 0, lostValue: 0, winRatePct: null, tendersDue: 0, approvedVariationValue: 0, funnel: [] },
  treasury: { cashOnHand: 18240500000, fxExposureValue: 0, fxExposureByCurrency: [], bgExpiringCount: 0, bgExpiringValue: 0, bgUtilisationPct: null, periodCloseStatus: 'OPEN', periodCloseProgressPct: null },
  generatedAt: new Date().toISOString(),
};

describe('DashboardPage', () => {
  beforeEach(() => {
    perms.can = () => true;
    ct.state = { data: sampleTower, isLoading: false, isError: false, refetch: vi.fn() };
  });

  // Timeout longgar: test pertama melakukan dynamic import modul besar (cold
  // start) yang bisa melewati 5s saat suite berjalan paralel.
  const T = 20_000;

  it('renders the page header with title and scope', async () => {
    const { DashboardPage } = await import('./dashboard.page');
    render(<DashboardPage />);
    expect(screen.getByRole('heading', { level: 1, name: /Control Tower/i })).toBeTruthy();
    expect(screen.getByTestId('filter-bar')).toBeTruthy();
  }, T);

  it('renders KPI stats, exception queue and portfolio ledger', async () => {
    const { DashboardPage } = await import('./dashboard.page');
    render(<DashboardPage />);
    expect(screen.getAllByText('Cash on hand').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Approval SLA')).toBeTruthy();
    expect(screen.getByText('Ring Road')).toBeTruthy();
  }, T);

  it('renders abbreviated KPI money, not the full zero-filled figure', async () => {
    const { DashboardPage } = await import('./dashboard.page');
    const { container } = render(<DashboardPage />);
    // Cash on hand = 18.240.500.000 → elemen KPI menampilkan "Rp 18,24 M".
    const kpiValues = Array.from(container.querySelectorAll('[data-slot="kpi-value"]')).map((el) => el.textContent ?? '');
    expect(kpiValues.length).toBeGreaterThanOrEqual(1);
    expect(kpiValues.some((t) => t.includes('Rp 18,24 M'))).toBe(true);
    // Tidak ada elemen KPI yang menampilkan angka penuh ber-nol.
    expect(kpiValues.some((t) => t.includes('Rp 18.240.500.000'))).toBe(false);
  }, T);

  it('shows an error state with a retry when the tower fails (never Rp 0)', async () => {
    ct.state = { data: undefined, isLoading: false, isError: true, refetch: vi.fn() };
    const { DashboardPage } = await import('./dashboard.page');
    render(<DashboardPage />);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.queryByText(/Rp\s?0/)).toBeNull();
  }, T);

  it('hides analytics content for a user without Analytics.VIEW', async () => {
    perms.can = (code) => code !== 'Analytics.VIEW';
    const { DashboardPage } = await import('./dashboard.page');
    render(<DashboardPage />);
    expect(screen.getByTestId('filter-bar')).toBeTruthy();
    expect(screen.queryByText('Cash on hand')).toBeNull();
    expect(screen.queryByTestId('triage')).toBeNull();
  }, T);

  it('still renders the anomaly triage zone for analytics users', async () => {
    const { DashboardPage } = await import('./dashboard.page');
    render(<DashboardPage />);
    expect(screen.getByTestId('triage')).toBeTruthy();
  }, T);
});
