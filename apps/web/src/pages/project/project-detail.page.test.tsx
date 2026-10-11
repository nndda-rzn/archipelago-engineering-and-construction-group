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
    useProjectActivity: () => ({ data: [{ id: 'a1', action: 'PROJECT.UPDATE', summary: 'Project details updated', actorId: 'u1', at: '2026-10-06T00:00:00.000Z' }], isLoading: false }),
    useProjectSummary: () => ({
      data: {
        project: { id: 'p1', code: 'PRJ-01', name: 'Alpha EPC', client: 'PT Klien', status: 'ACTIVE', phase: 'CONSTRUCTION', healthStatus: 'AT_RISK', type: 'EPC', priority: 'HIGH', currency: 'IDR', location: 'Karawang', legalEntityCode: 'LE-AEC', manager: { id: 'e1', name: 'Andi Pratama', position: 'PM' }, director: { id: 'e2', name: 'Budi', position: 'Director' }, startDate: '2026-01-15T00:00:00.000Z', completionDate: '2027-08-30T00:00:00.000Z' },
        schedule: { progressPlanned: 55, progressActual: 48, variance: -7, milestoneTotal: 5, milestoneAchieved: 4, milestoneMissed: 1, gateHold: 0 },
        cost: { contractValue: 42_100_000_000, budget: 38_000_000_000, committed: 13_300_000_000, actual: 27_400_000_000, certified: 20_000_000_000, billed: 18_000_000_000, collected: 12_000_000_000, cpi: 0.99 },
        signals: [
          { key: 'schedule', label: 'Schedule', value: -7, unit: 'pts', tone: 'warn' },
          { key: 'cpi', label: 'CPI', value: 0.99, unit: '', tone: 'warn' },
          { key: 'risk', label: 'Open risks', value: 3, unit: '', tone: 'warn' },
        ],
        analytics: {
          riskMatrix: [{ likelihood: 4, impact: 4, count: 2 }],
          qualityMix: [{ key: 'MAJOR', count: 1 }],
          hseMix: [{ key: 'LOW', count: 1 }],
          documentsMix: [{ key: 'Drawing:PUBLISHED', count: 1 }],
          billing: { certified: 20_000_000_000, billed: 18_000_000_000, collected: 12_000_000_000, approvedVariation: 0 },
        },
        domains: {
          commercial: { contract: 1, progressClaim: 20_000_000_000, clientInvoice: 18_000_000_000, collection: 12_000_000_000, variation: 2 },
          procurement: { pr: 3, po: 2, vendorInvoice: 4, subcontract: 1 },
          execution: { workPackage: 1, dailyReport: 3 },
          quality: { ncrOpen: 2, punchOpen: 0 },
          hse: { incidentOpen: 1 },
          governance: { riskOpen: 3, gateHold: 0 },
          engineering: { drawing: 2, deliverable: 1 },
        },
        generatedAt: '',
      },
      isLoading: false,
    }),
    useProjectSchedule: () => ({
      data: {
        progressPlanned: 55, progressActual: 48,
        plannedCurve: [{ period: '2026-Q1', planned: 100, plannedCumulative: 100, plannedPct: 25 }, { period: '2026-Q2', planned: 300, plannedCumulative: 400, plannedPct: 100 }],
        actualProgressCurve: [{ period: '2026-01', value: 100, cumulative: 100, pct: 20 }, { period: '2026-02', value: 300, cumulative: 400, pct: 95 }],
        actualCostCurve: [{ period: '2026-01', value: 50, cumulative: 50 }],
        milestones: [{ id: 'm1', name: 'Design Freeze', plannedDate: '2026-03-01T00:00:00.000Z', actualDate: null, status: 'PLANNED', weight: 20, isCritical: true, notes: null }],
        phases: [{ phase: 'INITIATION', enteredAt: '2026-01-01T00:00:00.000Z', exitedAt: null, note: null }],
        gates: [{ id: 'g1', gate: 'G2 Engineering', phase: 'ENGINEERING', decision: 'GO', decidedAt: '2026-03-01T00:00:00.000Z', notes: null }],
      },
      isLoading: false,
    }),
    useProjectCashFlow: () => ({
      data: { projectId: 'p1', chain: [
        { key: 'contract', label: 'Contract', value: 42_100_000_000 }, { key: 'budget', label: 'Budget', value: 38_000_000_000 },
        { key: 'committed', label: 'Committed', value: 13_300_000_000 }, { key: 'actual', label: 'Actual', value: 27_400_000_000 },
        { key: 'billed', label: 'Billed', value: 18_000_000_000 }, { key: 'collected', label: 'Collected', value: 12_000_000_000 },
      ], generatedAt: '' },
      isLoading: false,
    }),
    useProjectStakeholders: () => ({ data: [{ id: 's1', name: 'Budi Santoso', role: 'Project Sponsor', raci: 'ACCOUNTABLE', employeeId: null, email: null, phone: null, isPrimary: true }], isLoading: false }),
    useProjectDomains: () => ({
      data: {
        commercial: {
          progressClaims: [{ id: 'c1', ref: 'CLM-1', label: '2026-04', status: 'CERTIFIED', value: 20_000_000_000 }],
          clientInvoices: [{ id: 'ci1', ref: 'CINV-1', label: '', status: 'POSTED', value: 18_000_000_000 }],
          collections: [],
          variations: [],
        },
        procurement: {
          requisitions: [{ id: 'pr1', ref: 'PR-1', label: 'Material', status: 'APPROVED' }],
          purchaseOrders: [{ id: 'po1', ref: 'PO-1', label: 'PT Baja Utama', status: 'RELEASED', value: 150_000_000 }],
          vendorInvoices: [],
          subcontracts: [],
        },
        execution: { workPackages: [{ id: 'w1', ref: 'WP-1', label: 'Erection Steel Structure', status: 'IN_PROGRESS', score: 45 }], dailyReports: [{ id: 'd1', ref: 'DR-1', label: '2026-03-01', status: 'SUBMITTED' }] },
        quality: { ncrs: [{ id: 'n1', ref: 'NCR-1', label: 'Weld defect', status: 'OPEN', severity: 'MAJOR' }], punchItems: [] },
        hse: { incidents: [{ id: 'i1', ref: 'INC-1', label: 'NEAR_MISS', status: 'OPEN', severity: 'LOW' }], observations: [], permits: [] },
        documents: { drawings: [{ id: 'dr1', ref: 'DRW-1', label: 'GA Drawing', status: 'PUBLISHED', meta: 'CIVIL', flag: true }], deliverables: [] },
        governance: { risks: [{ id: 'r1', ref: 'RSK-1', label: 'Delay', status: 'OPEN', meta: 'SCHEDULE', score: 16 }], legalCases: [], contracts: [] },
      },
      isLoading: false,
    }),
    useAdvancePhase: () => ({ mutate: vi.fn(), isPending: false }),
    useProjectTeam: () => ({
      data: { items: [
        { assignmentId: 'as1', employeeId: 'e1', name: 'Ahmad Fauzi', position: 'Project Manager', department: 'Construction', grade: 'L3', employeeNumber: 'EMP-1', role: 'Project Manager', allocationPercent: 60, startDate: '2026-01-01T00:00:00.000Z', endDate: null, isKeyMember: true, status: 'ACTIVE' },
      ], total: 1, totalAllocation: 60 },
      isLoading: false,
    }),
    useProjectEmployees: () => ({ data: [] }),
    useAddProjectMember: () => ({ mutate: vi.fn(), isPending: false }),
    useRemoveProjectMember: () => ({ mutate: vi.fn() }),
    useProject: () => ({
      data: {
        id: 'p1', code: 'PRJ-01', name: 'Alpha EPC', client: 'PT Klien', legalEntityId: 'le1',
        businessUnit: null, location: 'Karawang', currency: 'IDR', contractValue: 42_100_000_000,
        advanceAmount: 3_000_000_000, advanceRecoveryRate: 10, startDate: '2026-01-15T00:00:00.000Z',
        completionDate: '2027-08-30T00:00:00.000Z', director: 'Budi', manager: 'Andi', status: 'ACTIVE',
        type: 'EPC', priority: 'HIGH',
        managerRef: { id: 'e1', name: 'Andi Pratama', position: 'Project Manager' },
        directorRef: { id: 'e2', name: 'Budi Santoso', position: 'Project Director' },
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
    expect(screen.getByText('Andi Pratama')).toBeTruthy();
  });

  it('renders a cost waterfall (Contract → Budget → Actual → Variance) on Overview', () => {
    const { container } = renderWithProviders(<ProjectDetailPage />);
    const bars = container.querySelectorAll('[data-slot="waterfall-bar"]');
    expect(bars.length).toBe(4);
  });

  it('shows commitment as a nested breakdown within the budget, on the Cost tab', () => {
    const { container } = renderWithProviders(<ProjectDetailPage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Cost & EVM' }));
    expect(container.querySelector('[data-slot="commitment"]')).toBeTruthy();
    expect(screen.getByText(/Remaining/i)).toBeTruthy();
  });

  it('exposes the eleven workspace tabs', () => {
    renderWithProviders(<ProjectDetailPage />);
    const tabs = screen.getAllByRole('tab').map((t) => t.textContent);
    expect(tabs).toEqual(['Overview', 'Schedule', 'Commercial', 'Procurement', 'Execution', 'Quality & HSE', 'Documents', 'Risk & Gov', 'Cost & EVM', 'Team', 'Activity']);
  });

  it('renders the lifecycle phase ribbon and at-a-glance signals', () => {
    const { container } = renderWithProviders(<ProjectDetailPage />);
    expect(container.querySelectorAll('[data-slot="phase-bar"]').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Project at a glance')).toBeTruthy();
    expect(screen.getAllByText('Schedule').length).toBeGreaterThan(0);
  });

  it('renders the planned-vs-actual S-curve and milestones on the Schedule tab', () => {
    const { container } = renderWithProviders(<ProjectDetailPage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Schedule' }));
    expect(screen.getByLabelText(/Planned progress/)).toBeTruthy();
    expect(screen.getByLabelText(/Actual progress/)).toBeTruthy();
    expect(screen.getByLabelText(/Milestones:/)).toBeTruthy();
    expect(container.querySelectorAll('[data-slot="milestone-dot"]').length).toBeGreaterThan(0);
  });

  it('shows the cash chain and billing position on the Overview tab', () => {
    const { container } = renderWithProviders(<ProjectDetailPage />);
    expect(container.querySelectorAll('[data-slot="cash-bar"]').length).toBe(6);
    expect(screen.getByText('Billing position')).toBeTruthy();
    expect(screen.getByLabelText(/Collected .*Certified/)).toBeTruthy();
  });

  it('renders EVM bars with CPI and SPI on the Cost & EVM tab', () => {
    const { container } = renderWithProviders(<ProjectDetailPage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Cost & EVM' }));
    expect(container.querySelectorAll('[data-slot="evm-bar"]')).toHaveLength(3);
    expect(screen.getAllByText('1.02').length).toBeGreaterThan(0);
    expect(screen.getAllByText('0.91').length).toBeGreaterThan(0);
  });

  it('shows the forecast as figures, not a chart, on the Cost & EVM tab', () => {
    renderWithProviders(<ProjectDetailPage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Cost & EVM' }));
    expect(screen.getByText(/EAC/i)).toBeTruthy();
    expect(screen.getByText(/VAC/i)).toBeTruthy();
  });

  it('shows commercial domain tiles on the Commercial tab', () => {
    renderWithProviders(<ProjectDetailPage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Commercial' }));
    expect(screen.getAllByText('Progress claims').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Client invoices').length).toBeGreaterThan(0);
    expect(screen.getByText('Billing position')).toBeTruthy();
  });

  it('lists execution work packages on the Execution tab', () => {
    renderWithProviders(<ProjectDetailPage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Execution' }));
    expect(screen.getByText('Erection Steel Structure')).toBeTruthy();
    expect(screen.getByText('WP-1')).toBeTruthy();
  });

  it('lists NCRs and HSE on the Quality & HSE tab', () => {
    renderWithProviders(<ProjectDetailPage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Quality & HSE' }));
    expect(screen.getByText('Weld defect')).toBeTruthy();
    expect(screen.getByText('INC-1')).toBeTruthy();
  });

  it('lists risks on the Risk & Gov tab', () => {
    renderWithProviders(<ProjectDetailPage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Risk & Gov' }));
    expect(screen.getByText('RSK-1')).toBeTruthy();
    expect(screen.getByText('Delay')).toBeTruthy();
  });

  it('shows the project team with allocation on the Team tab', () => {
    renderWithProviders(<ProjectDetailPage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Team' }));
    expect(screen.getByText('Ahmad Fauzi')).toBeTruthy();
    expect(screen.getByText('60%')).toBeTruthy();
  });

  it('renders the activity timeline on the Activity tab', () => {
    renderWithProviders(<ProjectDetailPage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Activity' }));
    expect(screen.getByText('Project details updated')).toBeTruthy();
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
    const labels = Array.from(header!.querySelectorAll('dt')).map((el) => el.textContent);
    expect(labels).toEqual(expect.arrayContaining(['Project manager', 'Director', 'Schedule', 'Location']));
  });

  it('puts the status on the same row as the title', () => {
    const { container } = renderWithProviders(<ProjectDetailPage />);
    const header = container.querySelector('header');
    expect(header?.querySelector('h1')).not.toBeNull();
    expect(header?.textContent).toMatch(/At Risk/);
  });

  it('keeps a single h1 and puts the edit action inside the header', () => {
    const { container } = renderWithProviders(<ProjectDetailPage />);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelector('header')?.querySelector('button')).not.toBeNull();
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
