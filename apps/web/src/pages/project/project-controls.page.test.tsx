import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';

const evmData = vi.hoisted(() => ({
  projectId: 'p1',
  projectCode: 'PRJ-EPC-2027-014',
  metrics: { pv: 4.8e12, ev: 2.16e12, ac: 2.333e12, bac: 4.8e12, progressPercent: 45, cpi: 0.93, spi: 0.45, cv: -1.7e11, sv: 2.16e12 },
  interpretation: { cpi: 'OVER_BUDGET', spi: 'BEHIND', health: 'AT_RISK', partial: false, utilization: 48.62 },
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

/** Satu CA lengkap, satu tanpa planned value — bentuk nyata setelah backfill sebagian. */
const accountsData = vi.hoisted(() => ({
  items: [
    { id: 'a1', projectId: 'p1', wbsItemId: 'w1', code: 'CA-014-ENG', name: 'Engineering & Design', responsibleManager: 'PM', budgetAmount: 4.8e11, plannedValue: 4.8e11, progressPercent: 100, isCriticalPath: true, scheduleStart: null, scheduleEnd: null, status: 'ACTIVE', dataIssue: false, createdAt: '', updatedAt: '', wbsItem: { code: '1', name: 'Engineering' } },
    { id: 'a2', projectId: 'p1', wbsItemId: 'w3', code: 'CA-014-CONS', name: 'Construction', responsibleManager: 'PM', budgetAmount: 0, plannedValue: 0, progressPercent: 35, isCriticalPath: false, scheduleStart: null, scheduleEnd: null, status: 'ACTIVE', dataIssue: true, createdAt: '', updatedAt: '', wbsItem: { code: '3', name: 'Construction' } },
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

describe('ProjectControlsPage — header', () => {
  it('names the project as h1, using the shared PageHeader scale', () => {
    renderPage();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe('EPC Industrial');
    // Header bersama memakai text-h1; halaman ini dulu memakai text-h2 font-light.
    expect(heading.className).toContain('text-h1');
    expect(heading.className).not.toContain('font-light');
  });

  it('carries the project code and data date as scope chips', () => {
    renderPage();
    expect(screen.getByText('PRJ-EPC-2027-014')).toBeTruthy();
    expect(screen.getByText(/DATA DATE 2026-Q3/)).toBeTruthy();
  });
});

describe('ProjectControlsPage — zona indeks', () => {
  it('leads with the indices, before any deviation table', () => {
    renderPage();
    const zone = screen.getByLabelText('Index');
    expect(within(zone).getByText('Cost performance')).toBeTruthy();
    expect(within(zone).getByText('Schedule performance')).toBeTruthy();
    expect(zone.textContent).toMatch(/0\.93/);
    expect(zone.textContent).toMatch(/0\.45/);
  });

  it('states each index delta against the 1,00 threshold', () => {
    renderPage();
    const zone = screen.getByLabelText('Index');
    expect(zone.textContent).toMatch(/−7% vs 1,00/);
    expect(zone.textContent).toMatch(/−55% vs 1,00/);
  });

  it('places BAC, EAC and actual cost on one shared money scale', () => {
    renderPage();
    const zone = screen.getByLabelText('Index');
    expect(zone.textContent).toMatch(/Budget at completion/);
    expect(zone.textContent).toMatch(/Forecast at completion/);
    expect(zone.textContent).toMatch(/Actual cost/);
    expect(zone.textContent).toMatch(/vertical marker = actual cost/);
  });
});

describe('ProjectControlsPage — zona penyimpangan', () => {
  it('lists deviations with their threshold and delta, without an empty header column', () => {
    renderPage();
    const zone = screen.getByLabelText('Deviations');
    expect(within(zone).getByText('Cost per unit of work')).toBeTruthy();
    expect(zone.textContent).toMatch(/0\.93/);
    expect(zone.textContent).toMatch(/1\.00/);
    expect(zone.querySelector('table')).toBeNull();
  });

  it('shows the forecast overshoot', () => {
    renderPage();
    const zone = screen.getByLabelText('Deviations');
    expect(within(zone).getByText(/Forecast at completion/)).toBeTruthy();
    expect(zone.textContent).toMatch(/Rp 4,99 T/);
  });

  it('is written in English, matching the rest of the application', () => {
    renderPage();
    const zone = screen.getByLabelText('Deviations');
    expect(zone.textContent).not.toMatch(/Keputusan|Sekarang|Ambang|Selisih|belum diisi/);
  });
});

describe('ProjectControlsPage — trajektori', () => {
  it('renders the S-curve with a budget threshold and data date', () => {
    renderPage();
    const svg = screen.getByLabelText(/trajectory/i).querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg!.textContent).toMatch(/BAC/);
    expect(svg!.textContent).toMatch(/data date/i);
    expect(svg!.textContent).toMatch(/EAC/);
  });
});

describe('ProjectControlsPage — sumber drift', () => {
  it('lists control accounts and flags the one without a planned value', () => {
    renderPage();
    const zone = screen.getByLabelText('Control accounts');
    expect(within(zone).getByText(/Engineering & Design/)).toBeTruthy();
    expect(zone.textContent).toMatch(/1 without planned value/);
    expect(zone.textContent).toMatch(/planned value missing/);
  });

  it('shows PV and earned for accounts that have a planned value', () => {
    renderPage();
    const zone = screen.getByLabelText('Control accounts');
    expect(zone.textContent).toMatch(/PV Rp 480 M/);
  });
});

describe('ProjectControlsPage — integritas data', () => {
  it('reports how many control accounts lack a planned value', () => {
    renderPage();
    const zone = screen.getByLabelText('Data integrity');
    expect(zone.textContent).toMatch(/1/);
    expect(zone.textContent).toMatch(/of|control account/);
    expect(zone.textContent).toMatch(/cannot be computed|not computable|only as reliable/i);
  });
});

describe('ProjectControlsPage — struktur', () => {
  it('does not render the removed tabs', () => {
    renderPage();
    for (const label of ['Cost Code', 'Control Account', 'Forecast', 'EVM', 'Commitment']) {
      expect(screen.queryByRole('button', { name: label })).toBeNull();
    }
  });

  it('does not use brand red for status text', () => {
    renderPage();
    const html = document.body.innerHTML;
    expect(html).not.toMatch(/racing-red/);
    expect(html).not.toMatch(/text-neutral-900\/[34]0/);
  });
});
