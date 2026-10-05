import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';

const params = vi.hoisted(() => ({ projectId: 'p1' }));
const updateMutate = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params: p, ...rest }: { children: React.ReactNode; to: string; params?: Record<string, string> }) => {
    let href = to;
    if (p) for (const [k, v] of Object.entries(p)) href = href.replace(`$${k}`, String(v));
    return <a href={href} {...rest}>{children}</a>;
  },
  useParams: () => params,
}));

vi.mock('@/entities/project', async () => {
  const actual = await vi.importActual<typeof import('@/entities/project')>('@/entities/project');
  return {
    ...actual,
    useUpdateProject: () => ({ mutate: updateMutate, isPending: false, isError: false }),
    useProject: () => ({
      data: {
        id: 'p1', code: 'PRJ-01', name: 'Alpha EPC', client: 'PT Klien', legalEntityId: 'le1',
        businessUnit: null, location: 'Karawang', currency: 'IDR', contractValue: 42_100_000_000,
        advanceAmount: 3_000_000_000, advanceRecoveryRate: 10, startDate: '2026-01-15T00:00:00.000Z',
        completionDate: '2027-08-30T00:00:00.000Z', director: 'Budi', manager: 'Andi', status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
      },
      isLoading: false,
      isError: false,
    }),
  };
});

vi.mock('@/features/project', async () => {
  const actual = await vi.importActual<typeof import('@/features/project')>('@/features/project');
  return {
    ...actual,
    useProjectHealth: () => ({
      data: {
        projectId: 'p1', projectCode: 'PRJ-01', projectName: 'Alpha EPC', client: 'PT Klien', legalEntityCode: 'LE-AEC',
        contractValue: 42_100_000_000, totalBudget: 38_000_000_000, totalActual: 27_400_000_000, revenue: 20_000_000_000,
        variance: 10_600_000_000, utilization: 72.1, health: 'AT_RISK' as const, generatedAt: '2026-10-06T00:00:00.000Z',
        wbs: [{ id: 'w1', code: '1.0', name: 'Civil', parentId: null, budget: 12_000_000_000, actual: 9_000_000_000, variance: 3_000_000_000, utilization: 75 }],
      },
      isLoading: false, isError: false, refetch: vi.fn(),
    }),
    useEvm: () => ({
      data: { projectId: 'p1', projectCode: 'PRJ-01', metrics: { pv: 30_000_000_000, ev: 27_400_000_000, ac: 26_800_000_000, bac: 38_000_000_000, progressPercent: 72, cpi: 1.02, spi: 0.91, cv: 600_000_000, sv: -2_600_000_000 }, interpretation: { cpi: 'ON_BUDGET', spi: 'BEHIND_SCHEDULE' }, generatedAt: '' },
      isLoading: false, isError: false,
    }),
    useCommitment: () => ({
      data: { projectId: 'p1', poCommitment: 9_200_000_000, subcontractCommitment: 4_100_000_000, totalCommitment: 13_300_000_000, totalBudget: 38_000_000_000, remainingBudget: 24_700_000_000, generatedAt: '' },
      isLoading: false, isError: false,
    }),
    useForecasts: () => ({
      data: { items: [{ id: 'f1', projectId: 'p1', version: 2, period: '2026-Q4', estimateAtCompletion: 40_100_000_000, estimateToComplete: 13_300_000_000, varianceAtCompletion: -2_100_000_000, status: 'DRAFT', note: null, createdBy: 'system', createdAt: '', updatedAt: '' }] },
      isLoading: false, isError: false,
    }),
  };
});

import { ProjectDetailPage } from './project-detail.page';

describe('ProjectDetailPage', () => {
  it('reads the project id from the route params and renders the identity header', () => {
    renderWithProviders(<ProjectDetailPage />);
    expect(screen.getByText('Alpha EPC')).toBeTruthy();
    expect(screen.getByText(/PRJ-01/)).toBeTruthy();
    expect(screen.getByText(/Andi/)).toBeTruthy();
  });

  it('renders a cost waterfall (Contract → Budget → Actual → Variance)', () => {
    const { container } = renderWithProviders(<ProjectDetailPage />);
    const bars = container.querySelectorAll('[data-slot="waterfall-bar"]');
    expect(bars.length).toBe(4);
  });

  it('renders EVM bars with CPI and SPI', () => {
    const { container } = renderWithProviders(<ProjectDetailPage />);
    expect(container.querySelectorAll('[data-slot="evm-bar"]')).toHaveLength(3);
    expect(screen.getByText('1.02')).toBeTruthy();
    expect(screen.getByText('0.91')).toBeTruthy();
  });

  it('shows commitment as a nested breakdown within the budget', () => {
    const { container } = renderWithProviders(<ProjectDetailPage />);
    expect(container.querySelector('[data-slot="commitment"]')).toBeTruthy();
    expect(screen.getByText(/Remaining/i)).toBeTruthy();
  });

  it('renders the WBS breakdown table', () => {
    renderWithProviders(<ProjectDetailPage />);
    expect(screen.getByText('Civil')).toBeTruthy();
  });

  it('shows the forecast as figures, not a chart', () => {
    renderWithProviders(<ProjectDetailPage />);
    expect(screen.getByText(/EAC/i)).toBeTruthy();
    expect(screen.getByText(/VAC/i)).toBeTruthy();
  });

  it('links to the sibling pages (WBS, budget, health, controls)', () => {
    renderWithProviders(<ProjectDetailPage />);
    expect(screen.getByRole('link', { name: /WBS/i }).getAttribute('href')).toContain('/wbs');
    expect(screen.getByRole('link', { name: /Budget/i }).getAttribute('href')).toContain('/budget');
  });

  it('renders an entity avatar tile (a component, not just text)', () => {
    const { container } = renderWithProviders(<ProjectDetailPage />);
    const avatar = container.querySelector('[data-slot="entity-avatar"]');
    expect(avatar).not.toBeNull();
    expect(avatar?.textContent).toBe('AE'); // "Alpha EPC"
  });

  it('shows metadata as labelled pairs instead of a middot-separated sentence', () => {
    const { container } = renderWithProviders(<ProjectDetailPage />);
    const header = container.querySelector('header');
    expect(header).not.toBeNull();
    // Label ada sebagai elemen sendiri (bukan dijejalkan dalam satu kalimat).
    const labels = Array.from(header!.querySelectorAll('dt')).map((el) => el.textContent);
    expect(labels).toEqual(expect.arrayContaining(['Client', 'Manager', 'Director', 'Schedule', 'Legal entity', 'Currency', 'Location', 'Budget used']));
    // …dan tidak ada lagi kalimat berjalan dengan pemisah middot.
    expect(header?.textContent).not.toMatch(/Manager Andi ·/);
    expect(header?.textContent).not.toMatch(/Director Budi ·/);
  });

  it('puts the status pill on the same row as the title', () => {
    const { container } = renderWithProviders(<ProjectDetailPage />);
    const row = container.querySelector('[data-slot="title-row"]');
    expect(row?.querySelector('h1')).not.toBeNull();
    expect(row?.textContent).toMatch(/At Risk/);
  });

  it('keeps a single h1 and puts the edit action inside the header', () => {
    const { container } = renderWithProviders(<ProjectDetailPage />);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelector('header')?.querySelector('button')).not.toBeNull();
  });

  it('renders related-page navigation as chips in a separate nav', () => {
    const { container } = renderWithProviders(<ProjectDetailPage />);
    const nav = container.querySelector('nav[aria-label="Related pages"]');
    expect(nav).not.toBeNull();
    expect(nav?.querySelectorAll('a').length).toBe(4);
  });

  it('offers a back link to the project list', () => {
    renderWithProviders(<ProjectDetailPage />);
    expect(screen.getByRole('link', { name: /Projects/i }).getAttribute('href')).toBe('/projects');
  });

  it('offers an edit action that opens a form pre-filled with current values', () => {
    renderWithProviders(<ProjectDetailPage />);
    fireEvent.click(screen.getByRole('button', { name: /Edit project/i }));
    expect((screen.getByLabelText(/Project name/i) as HTMLInputElement).value).toBe('Alpha EPC');
    expect((screen.getByLabelText(/Manager/i) as HTMLInputElement).value).toBe('Andi');
  });

  it('does not offer to edit the code or legal entity (identity fields)', () => {
    renderWithProviders(<ProjectDetailPage />);
    fireEvent.click(screen.getByRole('button', { name: /Edit project/i }));
    expect(screen.queryByLabelText(/Project code/i)).toBeNull();
    expect(screen.queryByLabelText(/Legal entity/i)).toBeNull();
  });

  it('offers a status control limited to the official statuses', () => {
    renderWithProviders(<ProjectDetailPage />);
    fireEvent.click(screen.getByRole('button', { name: /Edit project/i }));
    const status = screen.getByLabelText(/Status/i);
    expect(status.tagName).toBe('SELECT');
    const values = Array.from(status.querySelectorAll('option')).map((o) => o.getAttribute('value'));
    expect(values).toEqual(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CLOSED']);
  });

  it('submits only editable fields (never code or legalEntityId)', async () => {
    renderWithProviders(<ProjectDetailPage />);
    fireEvent.click(screen.getByRole('button', { name: /Edit project/i }));
    fireEvent.change(screen.getByLabelText(/Project name/i), { target: { value: 'Alpha v2' } });
    fireEvent.click(screen.getByRole('button', { name: /^Save/i }));
    await waitFor(() => expect(updateMutate).toHaveBeenCalled());
    const payload = updateMutate.mock.calls[0]![0] as Record<string, unknown>;
    expect(payload.name).toBe('Alpha v2');
    expect(payload.code).toBeUndefined();
    expect(payload.legalEntityId).toBeUndefined();
  });
});
