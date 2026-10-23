import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';

const portfolio = vi.hoisted(() => ({
  items: [
    { projectId: 'p1', code: 'PRJ-EPC-2027-020', name: 'Jetty Extension', legalEntityCode: 'AEC-MAR', contractValue: 1.85e12, bac: 1.85e12, pv: 1.11e12, ev: 1.147e12, ac: 1.042e12, cpi: 1.1, spi: 1.03, utilization: 56.4, progressPercent: 62, ncrs: 1, incidents: 1, risks: 0, health: 'ON_TRACK' as const, partial: false },
    { projectId: 'p2', code: 'PRJ-EPC-2027-021', name: 'Dredging', legalEntityCode: 'AEC-MAR', contractValue: 9.6e11, bac: 9.6e11, pv: 5.76e11, ev: 3.648e11, ac: 4.29e11, cpi: 0.85, spi: 0.63, utilization: 44.7, progressPercent: 38, ncrs: 1, incidents: 1, risks: 1, health: 'CRITICAL' as const, partial: false },
    { projectId: 'p3', code: 'PRJ-EPC-2027-014', name: 'EPC Industrial', legalEntityCode: 'AEC-CON', contractValue: 4.8e12, bac: 4.8e12, pv: 0, ev: 2.16e12, ac: 2.33e12, cpi: 0.93, spi: null, utilization: 48.6, progressPercent: 45, ncrs: 3, incidents: 3, risks: 5, health: 'AT_RISK' as const, partial: true },
    { projectId: 'p4', code: 'PRJ-EPC-2027-030', name: 'Feasibility', legalEntityCode: 'AEC-CON', contractValue: 4.5e10, bac: 0, pv: 0, ev: 0, ac: 9e8, cpi: null, spi: null, utilization: null, progressPercent: 0, ncrs: 1, incidents: 1, risks: 1, health: 'NO_BUDGET' as const, partial: false },
  ],
  countByHealth: { NO_BUDGET: 1, ON_TRACK: 1, AT_RISK: 1, CRITICAL: 1 },
  generatedAt: '2026-10-23T00:00:00.000Z',
}));

vi.mock('@/features/project', async () => {
  const actual = await vi.importActual<typeof import('@/features/project')>('@/features/project');
  return {
    ...actual,
    useHealthPortfolio: () => ({ data: portfolio, isLoading: false, isError: false, refetch: vi.fn() }),
  };
});

import { ProjectHealthPage } from './project-health.page';

describe('ProjectHealthPage', () => {
  it('uses the portfolio scope as the heading, not a generic label', () => {
    renderWithProviders(<ProjectHealthPage />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe('Portfolio health');
  });

  it('shows five health dimensions as distributions, not metric cards', () => {
    renderWithProviders(<ProjectHealthPage />);
    const bands = screen.getByLabelText('Health dimensions');
    for (const label of ['Cost', 'Schedule', 'Quality', 'Safety', 'Risk']) {
      expect(within(bands).getByText(label)).toBeTruthy();
    }
  });

  it('counts how many projects fall below the cost threshold', () => {
    renderWithProviders(<ProjectHealthPage />);
    const bands = screen.getByLabelText('Health dimensions');
    // Dua proyek ber-CPI < 1 (0,85 dan 0,93) dari tiga yang punya CPI.
    expect(bands.textContent).toMatch(/2 of 3 below 1\.00/);
  });

  it('reports projects without a schedule baseline instead of hiding them', () => {
    renderWithProviders(<ProjectHealthPage />);
    const bands = screen.getByLabelText('Health dimensions');
    expect(bands.textContent).toMatch(/without a schedule baseline/);
  });

  it('renders the map as the dominant element with an accessible description', () => {
    renderWithProviders(<ProjectHealthPage />);
    const map = screen.getByLabelText('CPI by SPI map');
    const svg = map.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg!.getAttribute('aria-label')).toMatch(/CPI/);
  });

  it('lists projects that need attention, worst first', () => {
    renderWithProviders(<ProjectHealthPage />);
    const rail = screen.getByLabelText('Needs attention');
    expect(rail.textContent).toMatch(/Dredging/);
    expect(rail.textContent).not.toMatch(/Jetty Extension/);
  });

  it('shows project detail in the rail when a point is selected', () => {
    renderWithProviders(<ProjectHealthPage />);
    fireEvent.click(screen.getByRole('button', { name: /PRJ-EPC-2027-020|Jetty Extension/ }));
    const rail = screen.getByLabelText('Project detail');
    expect(rail.textContent).toMatch(/Jetty Extension/);
    expect(rail.textContent).toMatch(/1\.10/);
  });

  it('keeps the table out of the composition until asked for', () => {
    renderWithProviders(<ProjectHealthPage />);
    expect(screen.queryByRole('table')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /as a table/i }));
    expect(screen.getByRole('table')).toBeTruthy();
  });

  it('summarises the portfolio counts in the strip', () => {
    renderWithProviders(<ProjectHealthPage />);
    const strip = screen.getByLabelText('Portfolio summary');
    expect(strip.textContent).toMatch(/1 on track/);
    expect(strip.textContent).toMatch(/1 critical/);
  });
});
