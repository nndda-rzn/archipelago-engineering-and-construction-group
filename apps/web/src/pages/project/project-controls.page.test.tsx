import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';

const evmData = vi.hoisted(() => ({
  projectId: 'p1',
  projectCode: 'PRJ-EPC-2027-014',
  metrics: { pv: 0, ev: 2.16e12, ac: 2.333e12, bac: 4.8e12, progressPercent: 45, cpi: 0.93, spi: null, cv: -1.7e11, sv: 2.16e12 },
  interpretation: { cpi: 'OVER_BUDGET', spi: 'N/A', health: 'AT_RISK', partial: true, utilization: 48.62 },
  generatedAt: '2026-10-23T00:00:00.000Z',
}));

const scheduleData = vi.hoisted(() => ({
  progressPlanned: 55,
  progressActual: 48,
  plannedCurve: [
    { period: '2026-Q1', planned: 1e12, plannedCumulative: 1e12, plannedPct: 20 },
    { period: '2026-Q2', planned: 1.5e12, plannedCumulative: 2.5e12, plannedPct: 52 },
    { period: '2026-Q3', planned: 2.3e12, plannedCumulative: 4.8e12, plannedPct: 100 },
  ],
  actualProgressCurve: [
    { period: '2026-Q1', value: 6e11, cumulative: 6e11, pct: 12 },
    { period: '2026-Q2', value: 9e11, cumulative: 1.5e12, pct: 31 },
    { period: '2026-Q3', value: 6.6e11, cumulative: 2.16e12, pct: 45 },
  ],
  actualCostCurve: [
    { period: '2026-Q2', value: 1e12, cumulative: 1e12 },
    { period: '2026-Q3', value: 1.333e12, cumulative: 2.333e12 },
  ],
  milestones: [],
  phases: [],
  gates: [],
}));

const accountsData = vi.hoisted(() => ({
  items: [
    { id: 'a1', projectId: 'p1', wbsItemId: 'w1', code: 'CA-014-ENG', name: 'Engineering & Design', responsibleManager: 'PM', budgetAmount: 0, plannedValue: 0, progressPercent: 100, isCriticalPath: true, scheduleStart: null, scheduleEnd: null, status: 'ACTIVE', dataIssue: true, createdAt: '', updatedAt: '', wbsItem: { code: '1', name: 'Engineering' } },
    { id: 'a2', projectId: 'p1', wbsItemId: 'w2', code: 'CA-014-CONS', name: 'Construction', responsibleManager: 'PM', budgetAmount: 0, plannedValue: 0, progressPercent: 35, isCriticalPath: false, scheduleStart: null, scheduleEnd: null, status: 'ACTIVE', dataIssue: true, createdAt: '', updatedAt: '', wbsItem: { code: '3', name: 'Construction' } },
  ],
  total: 2,
  page: 1,
  pageSize: 100,
  totalPages: 1,
}));

const forecastsData = vi.hoisted(() => ({
  items: [{ version: 1, period: '2026-Q4', estimateAtCompletion: 4.992e12, estimateToComplete: 2.496e12, varianceAtCompletion: -1.92e11, status: 'APPROVED' }],
  total: 1,
}));

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
    useEvm: () => ({ data: evmData, isLoading: false, isError: false, refetch: vi.fn() }),
    useControlAccounts: () => ({ data: accountsData, isLoading: false, isError: false, refetch: vi.fn() }),
    useForecasts: () => ({ data: forecastsData, isLoading: false, isError: false, refetch: vi.fn() }),
  };
});

vi.mock('@/entities/project', async () => {
  const actual = await vi.importActual<typeof import('@/entities/project')>('@/entities/project');
  return {
    ...actual,
    useProjects: () => ({ data: { items: [{ id: 'p1', code: 'PRJ-EPC-2027-014', name: 'EPC Industrial', currency: 'IDR' }] } }),
    useProjectSchedule: () => ({ data: scheduleData, isLoading: false, isError: false, refetch: vi.fn() }),
  };
});

import { ProjectControlsPage } from './project-controls.page';

const renderPage = () => {
  renderWithProviders(<ProjectControlsPage />);
  fireEvent.click(screen.getByRole('button', { name: 'pick-project' }));
};

describe('ProjectControlsPage', () => {
  it('names the project, not a generic page label', () => {
    renderPage();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe('EPC Industrial');
  });

  it('leads with the decision table, not the chart', () => {
    renderPage();
    const zone = screen.getByLabelText('Decisions required');
    // Tabel keputusan: label baris, nilai sekarang, ambang, selisih.
    expect(within(zone).getByText('Biaya per unit pekerjaan')).toBeTruthy();
    expect(zone.textContent).toMatch(/0\.93/);
    expect(zone.textContent).toMatch(/1\.00/);
  });

  it('shows the forecast overshoot against its threshold', () => {
    renderPage();
    const zone = screen.getByLabelText('Decisions required');
    expect(within(zone).getByText('Proyeksi akhir (EAC)')).toBeTruthy();
    expect(zone.textContent).toMatch(/Rp 4,99 T/);
    expect(zone.textContent).toMatch(/Rp 4,8 T/);
  });

  it('states that schedule cannot be assessed when planned value is missing', () => {
    renderPage();
    const zone = screen.getByLabelText('Decisions required');
    expect(within(zone).getByText('Jadwal')).toBeTruthy();
    expect(zone.textContent).toMatch(/n\/a/);
    expect(zone.textContent).toMatch(/PV belum diisi di 2 dari 2 control account/);
  });

  it('does not decorate every row with a warning icon', () => {
    renderPage();
    const zone = screen.getByLabelText('Decisions required');
    expect(zone.textContent).not.toMatch(/▲/);
  });

  it('renders the trajectory with a budget threshold line', () => {
    renderPage();
    const svg = screen.getByLabelText(/trajectory/i).querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg!.textContent).toMatch(/BAC/);
  });

  it('marks the data date on the trajectory', () => {
    renderPage();
    const svg = screen.getByLabelText(/trajectory/i).querySelector('svg');
    expect(svg!.textContent).toMatch(/data date/i);
  });

  it('shows the forecast at completion as a continuation of the curve', () => {
    renderPage();
    const svg = screen.getByLabelText(/trajectory/i).querySelector('svg');
    expect(svg!.textContent).toMatch(/EAC/);
  });

  it('lists control accounts and flags the ones without a planned value', () => {
    renderPage();
    const zone = screen.getByLabelText('Control accounts');
    expect(within(zone).getByText(/Engineering & Design/)).toBeTruthy();
    expect(zone.textContent).toMatch(/2 dari 2/);
    expect(zone.textContent).toMatch(/PV belum diisi/);
  });

  it('no longer renders tabs', () => {
    renderPage();
    for (const label of ['Cost Code', 'Control Account', 'Forecast', 'EVM', 'Commitment']) {
      expect(screen.queryByRole('button', { name: label })).toBeNull();
    }
  });
});
