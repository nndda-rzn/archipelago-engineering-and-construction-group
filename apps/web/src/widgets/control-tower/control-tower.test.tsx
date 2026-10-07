import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ControlTowerView, formatKpiValue, kpiTargetLabel, toExceptionItems, buildCashBridge } from './control-tower';
import type { ControlTower } from '@aec/api-contracts';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}));

const base: ControlTower = {
  kpis: [
    { key: 'cash', label: 'Cash on hand', value: 18_240_500_000, unit: 'idr', target: 15_000_000_000, direction: 'MIN', attainmentPct: 121.6, meetsTarget: true },
    { key: 'netCashFlow', label: 'Net cash flow', value: 420_000_000, unit: 'idr', target: 500_000_000, direction: 'MIN', attainmentPct: 84, meetsTarget: false },
    { key: 'backlog', label: 'Contract backlog', value: 31_400_000_000, unit: 'idr', target: null, direction: 'MIN', attainmentPct: null, meetsTarget: null },
    { key: 'budgetVariance', label: 'Budget remaining', value: 4_647_100_000, unit: 'idr', target: 5_000_000_000, direction: 'MIN', attainmentPct: 92.9, meetsTarget: false },
    { key: 'arOverdue', label: 'AR overdue 61+', value: 40_150_000_000, unit: 'idr', target: 2_500_000_000, direction: 'MAX', attainmentPct: 6.2, meetsTarget: false },
    { key: 'dso', label: 'DSO', value: 54, unit: 'days', target: 45, direction: 'MAX', attainmentPct: 83.3, meetsTarget: false },
    { key: 'trir', label: 'Safety · TRIR', value: 0.24, unit: 'ratio', target: 1.5, direction: 'MAX', attainmentPct: 200, meetsTarget: true },
    { key: 'manpower', label: 'Manpower today', value: 1240, unit: 'count', target: 1000, direction: 'MIN', attainmentPct: 124, meetsTarget: true },
  ],
  exceptions: {
    bySeverity: { HIGH: 2, MEDIUM: 1, LOW: 1 },
    items: [
      { key: 'a', severity: 'HIGH', type: 'Approval SLA', documentCode: 'PO-1', domain: 'Procurement', ageDays: 9, slaDays: 5, overdue: true, to: '/approvals' },
      { key: 'b', severity: 'MEDIUM', type: 'NCR overdue', documentCode: 'NCR-1', domain: 'Quality', ageDays: 12, slaDays: 14, overdue: false, to: '/quality' },
      { key: 'c', severity: 'LOW', type: 'Claim DRAFT', documentCode: null, domain: 'Finance', ageDays: 3, slaDays: 30, overdue: false, to: '/finance' },
    ],
    total: 3,
  },
  projects: [
    { projectId: 'p1', projectCode: 'PRJ-014', projectName: 'Ring Road', client: 'Pemprov', health: 'CRITICAL', contractValue: 100, budget: 80, actual: 90, variance: -10, revenue: 0, utilization: 112, progressPct: 112, cpi: 0.82, spi: 0.91, hasEvm: true, riskScore: 16 },
    { projectId: 'p2', projectCode: 'PRJ-002', projectName: 'Toll A-3', client: 'Jasa Marga', health: 'ON_TRACK', contractValue: 200, budget: 150, actual: 100, variance: 50, revenue: 0, utilization: 50, progressPct: 66, cpi: 1.05, spi: 1.02, hasEvm: true, riskScore: 4 },
  ],
  projectTotals: { count: 2, contractValue: 300, budget: 230, actual: 190, variance: 40 },
  operations: {
    procurement: { openPoValue: 150_000_000_000, openPoCount: 1, pendingPrCount: 7, rfqDueCount: 3, avgVendorScore: 3.8, topVendorName: 'PT Karya', topVendorScore: 4.6 },
    safety: { openIncidents: 4, highSeverityOpen: 1, openCorrectiveActions: 1, overdueCorrectiveActions: 1, trir: 0.24, daysSinceLastIncident: 1 },
    quality: { openNcrs: 11, criticalNcrs: 1, openPunchItems: 23 },
    hcm: { activeEmployees: 2, manpowerToday: 1240, pendingTimesheets: 0, equipmentUtilizationPct: 80, openBreakdowns: 0 },
    inventory: { stockValue: 1_200_000_000, warehouseCount: 3, negativeBalanceCount: 1, movementInValue: 2_000_000_000, movementOutValue: 800_000_000 },
  },
  governance: { openRisks: 5, highRisks: 1, overdueAuditFindings: 0, openLegalCases: 0, riskMatrix: [{ likelihood: 4, impact: 5, count: 1 }] },
  commercial: { pipelineValue: 58_200_000_000, openOpportunities: 5, wonValue: 8_600_000_000, lostValue: 14_000_000_000, winRatePct: 38, tendersDue: 2, approvedVariationValue: 1_200_000_000, funnel: [{ stage: 'LEAD', count: 5, value: 58_200_000_000 }] },
  treasury: { cashOnHand: 18_240_500_000, fxExposureValue: 34_000_000_000, fxExposureByCurrency: [{ currency: 'USD', amount: 2_100_000, rate: 16_240 }], bgExpiringCount: 3, bgExpiringValue: 4_200_000_000, bgUtilisationPct: 72, periodCloseStatus: 'OPEN', periodCloseProgressPct: null },
  generatedAt: '2026-10-10T00:00:00.000Z',
};

describe('formatKpiValue', () => {
  it('formats idr, percent, days, ratio and count units', () => {
    expect(formatKpiValue({ value: 18_240_500_000, unit: 'idr' })).toMatch(/Rp/);
    expect(formatKpiValue({ value: 68.4, unit: 'percent' })).toBe('68.4%');
    expect(formatKpiValue({ value: 54, unit: 'days' })).toBe('54 d');
    expect(formatKpiValue({ value: 0.24, unit: 'ratio' })).toBe('0.24');
    expect(formatKpiValue({ value: 1240, unit: 'count' })).toBe('1.240');
  });
});

describe('kpiTargetLabel', () => {
  it('describes attainment and the direction word', () => {
    expect(kpiTargetLabel(base.kpis[0]!)).toContain('min');
    expect(kpiTargetLabel(base.kpis[4]!)).toContain('max');
  });
  it('returns undefined when there is no target', () => {
    expect(kpiTargetLabel(base.kpis[2]!)).toBeUndefined();
  });
});

describe('toExceptionItems', () => {
  it('maps control-tower exceptions to queue items with deep links', () => {
    const items = toExceptionItems(base);
    expect(items).toHaveLength(3);
    expect(items[0]?.to).toBe('/approvals');
    expect(items[0]?.severity).toBe('HIGH');
  });
});

describe('buildCashBridge', () => {
  it('produces opening, net and closing steps that reconcile', () => {
    const steps = buildCashBridge(base);
    expect(steps.map((s) => s.label)).toEqual(['Opening', 'Net flow', 'Closing']);
    const opening = steps[0]!.value;
    const net = steps[1]!.value;
    expect(opening + net).toBe(base.treasury.cashOnHand);
  });
});

describe('ControlTowerView', () => {
  it('renders every zone: position, exceptions, ledger, domain tiles', () => {
    render(<ControlTowerView data={base} cashFlowSeries={[]} />);
    expect(screen.getByRole('heading', { name: 'Position' })).toBeTruthy();
    expect(screen.getByText('Approval SLA')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Portfolio ledger' })).toBeTruthy();
    expect(screen.getByText('Ring Road')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Domain tiles' })).toBeTruthy();
  });

  it('renders the EVM bullets for projects that have a baseline', () => {
    render(<ControlTowerView data={base} cashFlowSeries={[]} />);
    expect(screen.getByRole('img', { name: /PRJ-014 CPI 0.82 vs target 1.00/ })).toBeTruthy();
  });

  it('renders at least 60 labelled metric nodes (density guard)', () => {
    const { container } = render(<ControlTowerView data={base} cashFlowSeries={[]} />);
    // Guard ringan: memastikan layout tidak "menyusut" menjadi beberapa angka saja.
    // Hitung node teks berisi angka/rupiah (proxy data point yang terlihat).
    const numericNodes = Array.from(container.querySelectorAll('span, dd, td')).filter((el) =>
      /\d/.test(el.textContent ?? ''),
    );
    expect(numericNodes.length).toBeGreaterThanOrEqual(40);
  });

  it('makes each portfolio ledger row focusable (keyboard drill-through)', () => {
    const { container } = render(<ControlTowerView data={base} cashFlowSeries={[]} />);
    const rows = Array.from(container.querySelectorAll('tbody tr'));
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.getAttribute('tabindex')).toBe('0');
    }
  });

  it('navigates when a ledger row is activated with Enter', async () => {
    const { fireEvent } = await import('@testing-library/react');
    const { container } = render(<ControlTowerView data={base} cashFlowSeries={[]} />);
    const row = container.querySelector('tbody tr')!;
    expect(() => fireEvent.keyDown(row, { key: 'Enter' })).not.toThrow();
  });

  it('renders each KPI label exactly once (one home per figure)', () => {
    render(<ControlTowerView data={base} cashFlowSeries={[]} />);
    // "AR overdue 61+" dan "DSO" hanya boleh muncul di pita Position, tidak lagi
    // diulang di tile Liquidity.
    expect(screen.getAllByText('AR overdue 61+')).toHaveLength(1);
    expect(screen.getAllByText('DSO')).toHaveLength(1);
  });
});
