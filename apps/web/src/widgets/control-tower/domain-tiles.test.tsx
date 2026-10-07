import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DomainTiles } from './domain-tiles';
import type { ControlTower } from '@aec/api-contracts';

const sampleTower: ControlTower = {
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
    items: [],
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

describe('DomainTiles', () => {
  it('renders all ten domain tiles', () => {
    render(<DomainTiles data={sampleTower} />);
    for (const name of ['Liquidity', 'Portfolio health', 'Safety', 'Quality', 'Procurement', 'HCM', 'Inventory', 'Governance', 'Commercial', 'Treasury'])
      expect(screen.getByRole('heading', { name })).toBeTruthy();
  });

  it('pairs each tile with a numeric text value (per-tile check)', () => {
    const { container } = render(<DomainTiles data={sampleTower} />);
    // Setiap tile harus punya >=1 nilai teks numerik, diperiksa per-tile.
    // Visual (role="img") TIDAK wajib di tiap tile: beberapa domain (mis. HCM)
    // lebih jujur sebagai angka berlabel daripada grafik. Yang wajib adalah
    // angkanya terbaca, bukan bergantung pada grafik/warna.
    const tiles = Array.from(container.querySelectorAll('h3')).map((h) => h.parentElement!);
    expect(tiles.length).toBe(10);
    for (const tile of tiles) {
      const numeric = Array.from(tile.querySelectorAll('dd')).some((dd) => /\d/.test(dd.textContent ?? ''));
      expect(numeric).toBe(true);
    }
    // Visual tetap ada di mayoritas tile (heatmap, stage bars, bullet, dll).
    expect(container.querySelectorAll('[role="img"]').length).toBeGreaterThanOrEqual(6);
  });

  it('renders a neutral empty state when BG utilisation is missing (no fake 0%)', () => {
    render(<DomainTiles data={{ ...sampleTower, treasury: { ...sampleTower.treasury, bgUtilisationPct: null } }} />);
    expect(screen.getByText('No BG utilisation data.')).toBeTruthy();
    expect(screen.queryByText('0%')).toBeNull();
  });

  it('keeps tile headings normal-case (no uppercase eyebrow class)', () => {
    render(<DomainTiles data={sampleTower} />);
    for (const name of ['Liquidity', 'Portfolio health', 'Safety', 'Quality', 'Procurement', 'HCM', 'Inventory', 'Governance', 'Commercial', 'Treasury']) {
      const heading = screen.getByRole('heading', { name });
      expect(heading.className).not.toContain('uppercase');
    }
  });
});
