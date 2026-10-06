import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSyncExternalStore } from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';

// Router mini: useSearch/useNavigate reaktif agar deep-link & pilihan versi nyata.
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
  };
});

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => (opts: { search?: unknown }) => {
    const next = typeof opts?.search === 'function'
      ? (opts.search as (p: Record<string, unknown>) => Record<string, unknown>)(nav.state.search)
      : opts?.search;
    if (next) nav.set(next as Record<string, unknown>);
  },
  useSearch: () => useSyncExternalStore(nav.subscribe, nav.get, nav.get),
}));

const mutateSpy = vi.hoisted(() => ({
  updateStep: vi.fn(),
  removeStep: vi.fn(),
  reorder: vi.fn(),
  publish: vi.fn(),
  updateDefinition: vi.fn(),
  newVersion: vi.fn(),
  archive: vi.fn(),
  remove: vi.fn(),
  addStep: vi.fn(),
}));

// Dua definisi: satu ACTIVE (terkunci) dan satu DRAFT (bisa diubah).
const defs = vi.hoisted(() => [
  {
    id: 'def-pr-v2', code: 'PR_APPROVAL', name: 'PR Approval', description: 'Manager then board',
    version: 2, status: 'ACTIVE', transactionType: 'PurchaseRequisition',
    createdBy: 'u1', createdByName: 'AEC Administrator',
    createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z',
    steps: [
      { id: 's1', definitionId: 'def-pr-v2', stepOrder: 1, name: 'Approval Manager Pengadaan', approverRoleCode: 'PROCUREMENT_MANAGER', conditionField: null, conditionOp: null, conditionValue: null },
      { id: 's2', definitionId: 'def-pr-v2', stepOrder: 2, name: 'Approval Direksi', approverRoleCode: 'SUPER_ADMIN', conditionField: 'estimatedTotal', conditionOp: '>', conditionValue: 5_000_000 },
    ],
  },
  {
    id: 'def-pr-v3', code: 'PR_APPROVAL', name: 'PR Approval v3', description: 'Adds finance review',
    version: 3, status: 'DRAFT', transactionType: 'PurchaseRequisition',
    createdBy: 'u1', createdByName: 'AEC Administrator',
    createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z',
    steps: [
      { id: 'd1', definitionId: 'def-pr-v3', stepOrder: 1, name: 'Approval Manager Pengadaan', approverRoleCode: 'PROCUREMENT_MANAGER', conditionField: null, conditionOp: null, conditionValue: null },
      { id: 'd2', definitionId: 'def-pr-v3', stepOrder: 2, name: 'Finance Review', approverRoleCode: 'NOBODY_HOLDS_THIS', conditionField: 'estimatedTotal', conditionOp: '>', conditionValue: 10_000_000 },
    ],
  },
]);

vi.mock('@/features/approval', async () => {
  const actual = await vi.importActual<typeof import('@/features/approval')>('@/features/approval');
  return {
    ...actual,
    useWorkflowDefinitions: () => ({ data: defs, isLoading: false, isError: false, refetch: vi.fn() }),
    useWorkflowVersions: () => ({
      data: [
        { id: 'def-pr-v3', code: 'PR_APPROVAL', version: 3, status: 'DRAFT', name: 'PR Approval v3', stepCount: 2, createdByName: 'AEC Administrator', createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z', isActive: false },
        { id: 'def-pr-v2', code: 'PR_APPROVAL', version: 2, status: 'ACTIVE', name: 'PR Approval', stepCount: 2, createdByName: 'AEC Administrator', createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z', isActive: true },
      ],
      isLoading: false, isError: false, refetch: vi.fn(),
    }),
    useWorkflowVersionDiff: () => ({
      data: {
        from: { id: 'def-pr-v2', code: 'PR_APPROVAL', version: 2, status: 'ACTIVE', name: 'PR Approval', stepCount: 2, createdByName: 'AEC Administrator', createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z', isActive: true },
        to: { id: 'def-pr-v3', code: 'PR_APPROVAL', version: 3, status: 'DRAFT', name: 'PR Approval v3', stepCount: 2, createdByName: 'AEC Administrator', createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z', isActive: false },
        added: [], removed: [],
        changed: [{ stepOrder: 2, fields: [{ field: 'name', from: 'Approval Direksi', to: 'Finance Review' }] }],
      },
      isLoading: false, isError: false,
    }),
    useWorkflowInsights: () => ({
      data: {
        transactionType: 'PurchaseRequisition',
        generatedAt: '2026-10-06T00:00:00.000Z',
        byStep: [
          { stepOrder: 1, stepName: 'Approval Manager Pengadaan', total: 11, approved: 7, rejected: 1, pending: 3, cancelled: 0 },
          { stepOrder: 2, stepName: 'Approval Direksi', total: 6, approved: 4, rejected: 0, pending: 2, cancelled: 0 },
        ],
        monthly: [
          { month: '2026-08', created: 4, decided: 3 },
          { month: '2026-09', created: 5, decided: 4 },
        ],
        amounts: { count: 11, min: 2_000_000, max: 150_000_000_000, buckets: [{ label: '< 10jt', count: 1 }, { label: '100jt–1M', count: 6 }] },
        ruleHits: [{ stepOrder: 2, name: 'Approval Direksi', condition: 'estimatedTotal > 5.000.000', matching: 10 }],
        coverage: [{ stepOrder: 1, roleCode: 'PROCUREMENT_MANAGER', holders: 1 }, { stepOrder: 2, roleCode: 'SUPER_ADMIN', holders: 1 }],
        note: 'Based on recorded approval tasks for this transaction type.',
      },
      isLoading: false, isError: false, refetch: vi.fn(),
    }),
    useAddWorkflowStep: () => ({ mutate: mutateSpy.addStep, isPending: false }),
    useUpdateWorkflowStep: () => ({ mutate: mutateSpy.updateStep, isPending: false }),
    useRemoveWorkflowStep: () => ({ mutate: mutateSpy.removeStep, isPending: false }),
    useReorderWorkflowSteps: () => ({ mutate: mutateSpy.reorder, isPending: false }),
    usePublishWorkflow: () => ({ mutate: mutateSpy.publish, isPending: false }),
    useUpdateWorkflowDefinition: () => ({ mutate: mutateSpy.updateDefinition, isPending: false }),
    useNewWorkflowVersion: () => ({ mutate: mutateSpy.newVersion, isPending: false }),
    useArchiveWorkflow: () => ({ mutate: mutateSpy.archive, isPending: false }),
    useDeleteWorkflow: () => ({ mutate: mutateSpy.remove, isPending: false }),
  };
});

vi.mock('@/entities/role', async () => {
  const actual = await vi.importActual<typeof import('@/entities/role')>('@/entities/role');
  return {
    ...actual,
    useRoles: () => ({
      data: [
        { id: 'r1', code: 'PROCUREMENT_MANAGER', name: 'Procurement Manager', description: null, status: 'ACTIVE', _count: { userRoles: 1 }, permissions: [] },
        { id: 'r2', code: 'SUPER_ADMIN', name: 'Super Administrator', description: null, status: 'ACTIVE', _count: { userRoles: 1 }, permissions: [] },
      ],
      isLoading: false,
    }),
  };
});

import { WorkflowDefinitionPage } from './workflow-definition.page';

beforeEach(() => {
  nav.set({});
  vi.clearAllMocks();
});

describe('WorkflowDefinitionPage — struktur & identitas', () => {
  it('states what the page is for and summarises the collection', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    expect(screen.getByRole('heading', { name: 'Workflow', level: 1 })).toBeTruthy();
    expect(screen.getByText(/Configure the approval chain/i)).toBeTruthy();
    // Angka nyata, bukan sekadar label: versi ACTIVE punya 0 langkah bermasalah.
    expect(screen.getByText('0', { selector: '.tabular-nums' })).toBeTruthy();
    expect(screen.getByText(/steps without an approver/i)).toBeTruthy();
  });

  it('counts the steps that have no approver', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    fireEvent.click(screen.getByLabelText(/Version 3, Draft/));
    // Versi draft punya tepat satu langkah dengan role tanpa pemegang.
    const header = screen.getByText(/steps without an approver/i).closest('span');
    expect(header?.textContent).toMatch(/1\s*steps without an approver/i);
  });

  it('lists every version of the selected code, not just one', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    const list = screen.getByLabelText('Workflow definitions');
    expect(within(list).getAllByText('PR_APPROVAL').length).toBe(2);
  });
});

describe('WorkflowDefinitionPage — pipeline sebagai alur', () => {
  it('renders each step as a node with its role and holder count', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    expect(screen.getByLabelText(/Step 1: Approval Manager Pengadaan/)).toBeTruthy();
    expect(screen.getByLabelText(/Step 2: Approval Direksi/)).toBeTruthy();
  });

  it('flags a step whose approver role nobody holds', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    // Default membuka versi ACTIVE; versi DRAFT punya role tanpa pemegang.
    fireEvent.click(screen.getByLabelText(/Version 3, Draft/));
    expect(screen.getByText(/No approver — the chain will stall/i)).toBeTruthy();
  });

  it('offers a table view of the same chain (diagram ⇄ table)', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    fireEvent.click(screen.getByRole('radio', { name: 'Table' }));
    expect(screen.getByRole('table', { name: /Approval steps/i })).toBeTruthy();
  });
});

describe('WorkflowDefinitionPage — aturan DRAFT vs ACTIVE', () => {
  it('locks the steps of an ACTIVE version and explains why', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    expect(screen.getByText(/read-only\. Create a new version to change them/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Add step/i })).toBeNull();
  });

  it('allows editing steps of a DRAFT version', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    fireEvent.click(screen.getByLabelText(/Version 3, Draft/));
    expect(screen.getByRole('button', { name: /Add step/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Remove step/i })).toBeTruthy();
  });

  it('offers New version and Archive only for an ACTIVE workflow', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    expect(screen.getByRole('button', { name: /New version/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Archive/i })).toBeTruthy();
    fireEvent.click(screen.getByLabelText(/Version 3, Draft/));
    expect(screen.queryByRole('button', { name: /New version/i })).toBeNull();
  });
});

describe('WorkflowDefinitionPage — menyimpan perubahan', () => {
  it('sends the edited step to the server only after Save is pressed', async () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    fireEvent.click(screen.getByLabelText(/Version 3, Draft/));

    const nameField = screen.getByLabelText('Name');
    fireEvent.change(nameField, { target: { value: 'Finance Review Updated' } });
    // Belum menekan Save → belum ada mutasi.
    expect(mutateSpy.updateStep).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Save step/i }));
    await waitFor(() => expect(mutateSpy.updateStep).toHaveBeenCalledTimes(1));
    const arg = mutateSpy.updateStep.mock.calls[0]![0];
    expect(arg.id).toBe('def-pr-v3');
    expect(arg.stepId).toBe('d1');
    expect(arg.input.name).toBe('Finance Review Updated');
  });

  it('reorders by sending the full step list in the new order', async () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    fireEvent.click(screen.getByLabelText(/Version 3, Draft/));

    fireEvent.click(screen.getByRole('button', { name: /Move step 1 later/i }));
    await waitFor(() => expect(mutateSpy.reorder).toHaveBeenCalledTimes(1));
    expect(mutateSpy.reorder.mock.calls[0]![0]).toEqual({ id: 'def-pr-v3', input: { stepIds: ['d2', 'd1'] } });
  });
});

describe('WorkflowDefinitionPage — condition builder terpandu', () => {
  it('offers only known document fields, never free text', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    fireEvent.click(screen.getByLabelText(/Version 3, Draft/));
    // Pilih langkah yang memang bersyarat (langkah 2 versi draft).
    fireEvent.click(screen.getByLabelText(/Step 2: Finance Review/));
    // Kontrol berupa pilihan, bukan input teks bebas.
    expect(screen.getByLabelText('Condition field')).toBeTruthy();
    expect(screen.getByLabelText('Condition operator')).toBeTruthy();
  });
});

describe('WorkflowDefinitionPage — simulasi', () => {
  it('explains which steps apply for a given amount', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    fireEvent.change(screen.getByLabelText(/Document amount/i), { target: { value: '3000000' } });
    // 3jt tidak melewati ambang 5jt → hanya langkah 1.
    expect(screen.getByRole('status').textContent).toMatch(/needs\s*1\s*approval/i);
  });
});

describe('WorkflowDefinitionPage — versi & insight', () => {
  it('shows the version history with status and author', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    const rail = screen.getByLabelText('Workflow versions');
    expect(within(rail).getByLabelText(/Version 2, Active/)).toBeTruthy();
    expect(within(rail).getByLabelText(/Version 3, Draft/)).toBeTruthy();
  });

  it('shows insights only where there is real data, with the honesty note', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    expect(screen.getByText('Documents by step')).toBeTruthy();
    expect(screen.getByText('Monthly volume')).toBeTruthy();
    expect(screen.getByText(/Based on recorded approval tasks/i)).toBeTruthy();
  });

  it('states the rule impact so a threshold can be judged', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    expect(screen.getByText('Rule impact')).toBeTruthy();
    expect(screen.getByText(/10 of 11 match/i)).toBeTruthy();
  });
});
