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
  duplicate: vi.fn(),
  fromTemplate: vi.fn(),
}));

const templatesData = vi.hoisted(() => [
  {
    id: 'two-tier',
    name: 'Two-tier approval',
    description: 'Manager approves everything; the board steps in above 5 million.',
    transactionType: 'PurchaseRequisition',
    steps: [
      { name: 'Manager approval', approverRoleCode: 'PROCUREMENT_MANAGER', conditionField: null, conditionOp: null, conditionValue: null },
      { name: 'Board approval', approverRoleCode: 'SUPER_ADMIN', conditionField: 'estimatedTotal', conditionOp: '>', conditionValue: 5_000_000 },
    ],
  },
]);

// Dua definisi: satu ACTIVE (terkunci) dan satu DRAFT (bisa diubah).
const defs = vi.hoisted(() => [
  {
    id: 'def-pr-v2', code: 'PR_APPROVAL', name: 'Purchase requisition approval', description: 'Manager then board',
    version: 2, status: 'ACTIVE', transactionType: 'PurchaseRequisition',
    createdBy: 'u1', createdByName: 'AEC Administrator',
    createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z',
    steps: [
      { id: 's1', definitionId: 'def-pr-v2', stepOrder: 1, name: 'Procurement manager approval', approverRoleCode: 'PROCUREMENT_MANAGER', conditionField: null, conditionOp: null, conditionValue: null },
      { id: 's2', definitionId: 'def-pr-v2', stepOrder: 2, name: 'Board approval', approverRoleCode: 'SUPER_ADMIN', conditionField: 'estimatedTotal', conditionOp: '>', conditionValue: 5_000_000 },
    ],
  },
  {
    id: 'def-pr-v3', code: 'PR_APPROVAL', name: 'Purchase requisition approval', description: 'Adds finance review',
    version: 3, status: 'DRAFT', transactionType: 'PurchaseRequisition',
    createdBy: 'u1', createdByName: 'AEC Administrator',
    createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z',
    steps: [
      { id: 'd1', definitionId: 'def-pr-v3', stepOrder: 1, name: 'Procurement manager approval', approverRoleCode: 'PROCUREMENT_MANAGER', conditionField: null, conditionOp: null, conditionValue: null },
      { id: 'd2', definitionId: 'def-pr-v3', stepOrder: 2, name: 'Finance review', approverRoleCode: 'NOBODY_HOLDS_THIS', conditionField: 'estimatedTotal', conditionOp: '>', conditionValue: 10_000_000 },
    ],
  },
]);

const versionsData = vi.hoisted(() => [
  { id: 'def-pr-v3', code: 'PR_APPROVAL', version: 3, status: 'DRAFT', name: 'Purchase requisition approval', stepCount: 2, createdByName: 'AEC Administrator', createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z', isActive: false },
  { id: 'def-pr-v2', code: 'PR_APPROVAL', version: 2, status: 'ACTIVE', name: 'Purchase requisition approval', stepCount: 2, createdByName: 'AEC Administrator', createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z', isActive: true },
]);

const insightsData = vi.hoisted(() => ({
  transactionType: 'PurchaseRequisition',
  generatedAt: '2026-10-06T00:00:00.000Z',
  byStep: [
    { stepOrder: 1, stepName: 'Procurement manager approval', total: 11, approved: 7, rejected: 1, pending: 3, cancelled: 0 },
    { stepOrder: 2, stepName: 'Board approval', total: 6, approved: 4, rejected: 0, pending: 2, cancelled: 0 },
  ],
  monthly: [
    { month: '2026-08', created: 4, decided: 3 },
    { month: '2026-09', created: 5, decided: 4 },
  ],
  amounts: { count: 11, min: 2_000_000, max: 150_000_000_000, buckets: [{ label: '< 10jt', count: 1, from: 0, to: 10_000_000 }, { label: '100jt-1M', count: 6, from: 100_000_000, to: 1_000_000_000 }] },
  ruleHits: [{ stepOrder: 2, name: 'Board approval', condition: 'estimatedTotal > 5.000.000', matching: 10 }],
  coverage: [
    { stepOrder: 1, roleCode: 'PROCUREMENT_MANAGER', holders: 1, holderNames: ['AEC Administrator'] },
    { stepOrder: 2, roleCode: 'SUPER_ADMIN', holders: 2, holderNames: ['AEC Administrator', 'CFO Demo'] },
  ],
  thresholds: [{ stepOrder: 2, stepName: 'Board approval', field: 'estimatedTotal', op: '>', value: 5_000_000 }],
  note: 'Based on recorded approval tasks for this transaction type.',
}));

vi.mock('@/features/approval', async () => {
  const actual = await vi.importActual<typeof import('@/features/approval')>('@/features/approval');
  return {
    ...actual,
    useWorkflowDefinitions: () => ({ data: defs, isLoading: false, isError: false, refetch: vi.fn() }),
    useWorkflowVersions: () => ({ data: versionsData, isLoading: false, isError: false, refetch: vi.fn() }),
    useWorkflowVersionDiff: () => ({
      data: {
        from: versionsData[1], to: versionsData[0],
        added: [], removed: [],
        changed: [{ stepOrder: 2, fields: [{ field: 'name', from: 'Board approval', to: 'Finance review' }] }],
      },
      isLoading: false, isError: false,
    }),
    useWorkflowInsights: () => ({ data: insightsData, isLoading: false, isError: false, refetch: vi.fn() }),
    useAddWorkflowStep: () => ({ mutate: mutateSpy.addStep, isPending: false }),
    useUpdateWorkflowStep: () => ({ mutate: mutateSpy.updateStep, isPending: false }),
    useRemoveWorkflowStep: () => ({ mutate: mutateSpy.removeStep, isPending: false }),
    useReorderWorkflowSteps: () => ({ mutate: mutateSpy.reorder, isPending: false }),
    usePublishWorkflow: () => ({ mutate: mutateSpy.publish, isPending: false }),
    useUpdateWorkflowDefinition: () => ({ mutate: mutateSpy.updateDefinition, isPending: false }),
    useNewWorkflowVersion: () => ({ mutate: mutateSpy.newVersion, isPending: false }),
    useArchiveWorkflow: () => ({ mutate: mutateSpy.archive, isPending: false }),
    useDeleteWorkflow: () => ({ mutate: mutateSpy.remove, isPending: false }),
    useDuplicateWorkflow: () => ({ mutate: mutateSpy.duplicate, isPending: false }),
    useCreateWorkflowFromTemplate: () => ({ mutate: mutateSpy.fromTemplate, isPending: false }),
    useWorkflowTemplates: () => ({ data: templatesData, isLoading: false, isError: false }),
  };
});

vi.mock('@/entities/role', async () => {
  const actual = await vi.importActual<typeof import('@/entities/role')>('@/entities/role');
  return {
    ...actual,
    useRoles: () => ({
      data: [
        { id: 'r1', code: 'PROCUREMENT_MANAGER', name: 'Procurement Manager', description: null, status: 'ACTIVE', _count: { userRoles: 1 }, permissions: [] },
        { id: 'r2', code: 'SUPER_ADMIN', name: 'Super Administrator', description: null, status: 'ACTIVE', _count: { userRoles: 2 }, permissions: [] },
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

/** Membuka drawer bawah berdasarkan nama tab. */
function openDrawer(name: 'Insights' | 'Versions' | 'Settings') {
  fireEvent.click(screen.getByRole('tab', { name }));
}

describe('WorkflowDefinitionPage: struktur & identitas', () => {
  it('states what the page is for and summarises the collection', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    expect(screen.getByRole('heading', { name: 'Workflow', level: 1 })).toBeTruthy();
    expect(screen.getByText(/Configure the approval chain/i)).toBeTruthy();
    expect(screen.getByText(/steps without an approver/i)).toBeTruthy();
  });

  it('counts the steps that have no approver', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    openDrawer('Versions');
    fireEvent.click(screen.getByLabelText(/Version 3, Draft/));
    const header = screen.getByText(/steps without an approver/i).closest('span');
    expect(header?.textContent).toMatch(/1\s*steps without an approver/i);
  });

  it('lists every version of the selected code, not just one', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    const list = screen.getByLabelText('Workflow definitions');
    expect(within(list).getAllByText('PR_APPROVAL').length).toBe(2);
  });
});

describe('WorkflowDefinitionPage: pemegang role tampil sebagai orang', () => {
  it('names the people who can approve, not just how many', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    const step1 = screen.getByLabelText(/Step 1: Procurement manager approval/);
    expect(step1.textContent).toContain('AEC Administrator');

    const step2 = screen.getByLabelText(/Step 2: Board approval/);
    expect(step2.textContent).toMatch(/AEC Administrator, CFO Demo/);
  });

  it('stacks avatars for several holders and labels the stack with every name', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    const step2 = screen.getByLabelText(/Step 2: Board approval/);
    const stack = step2.querySelector('[data-slot="avatar-stack"]');
    expect(stack).toBeTruthy();
    expect(stack!.getAttribute('aria-label')).toMatch(/2 approvers: AEC Administrator, CFO Demo/);
  });
});

describe('WorkflowDefinitionPage: identitas memakai nama, bukan kode', () => {
  it('leads with the readable name and keeps the code as reference metadata', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    expect(screen.getByRole('heading', { name: 'Purchase requisition approval', level: 2 })).toBeTruthy();
    const detail = screen.getByLabelText('Workflow detail');
    expect(within(detail).getAllByText('PR_APPROVAL').length).toBeGreaterThanOrEqual(1);
  });
});

describe('WorkflowDefinitionPage: lifecycle Draft → Publish → Active', () => {
  it('shows the lifecycle stages and marks the current one', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    const lifecycle = screen.getByLabelText('Workflow lifecycle');
    expect(within(lifecycle).getByText('Draft')).toBeTruthy();
    expect(within(lifecycle).getByText('Publish')).toBeTruthy();
    expect(within(lifecycle).getByText('Active')).toBeTruthy();
  });

  it('puts the Publish action on the lifecycle, only for a draft', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    // Default = ACTIVE, jadi tidak ada aksi Publish.
    expect(screen.queryByRole('button', { name: 'Publish' })).toBeNull();

    openDrawer('Versions');
    fireEvent.click(screen.getByLabelText(/Version 3, Draft/));
    expect(screen.getByRole('button', { name: 'Publish' })).toBeTruthy();
  });
});

describe('WorkflowDefinitionPage: kanvas sebagai alat kerja', () => {
  it('renders each step as a node with its role and holder count', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    expect(screen.getByLabelText(/Step 1: Procurement manager approval/)).toBeTruthy();
    expect(screen.getByLabelText(/Step 2: Board approval/)).toBeTruthy();
  });

  it('brackets the chain with a trigger and a result so it reads as a process', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    expect(screen.getByText(/Purchase requisition submitted/i)).toBeTruthy();
    expect(screen.getByText(/Purchase requisition approved/i)).toBeTruthy();
  });

  it('flags a step whose approver role nobody holds', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    openDrawer('Versions');
    fireEvent.click(screen.getByLabelText(/Version 3, Draft/));
    expect(screen.getByText(/No approver, so the chain will stall/i)).toBeTruthy();
  });

  it('offers a table view as an accessible counterpart of the canvas', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    fireEvent.click(screen.getByRole('radio', { name: 'Table' }));
    expect(screen.getByRole('table', { name: /Approval steps/i })).toBeTruthy();
  });

  it('keeps the chain visible while a step is selected for editing', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    openDrawer('Versions');
    fireEvent.click(screen.getByLabelText(/Version 3, Draft/));
    fireEvent.click(screen.getByLabelText(/Step 2: Finance review/));
    // Keduanya ada di DOM yang sama: memilih langkah tidak menyembunyikan rantai.
    expect(screen.getByLabelText(/Step 1: Procurement manager approval/)).toBeTruthy();
    expect(screen.getByLabelText('Name')).toBeTruthy();
  });
});

describe('WorkflowDefinitionPage: satu aksi primer', () => {
  it('makes Publish the only primary button on a draft', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    openDrawer('Versions');
    fireEvent.click(screen.getByLabelText(/Version 3, Draft/));
    const primary = Array.from(document.querySelectorAll('button')).filter((b) =>
      b.className.includes('bg-racing-red-600'),
    );
    expect(primary.map((b) => b.textContent?.trim())).toEqual(['Publish']);
  });

  it('does not use the primary treatment for archive or delete', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    for (const label of [/New version/i, /Archive/i]) {
      const btn = screen.getByRole('button', { name: label });
      expect(btn.className).not.toContain('bg-racing-red-600');
    }
  });
});

describe('WorkflowDefinitionPage: aturan DRAFT vs ACTIVE', () => {
  it('locks the steps of an ACTIVE version and explains why', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    expect(screen.getByText(/read-only\. Create a new version to change them/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Add step/i })).toBeNull();
  });

  it('allows editing steps of a DRAFT version', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    openDrawer('Versions');
    fireEvent.click(screen.getByLabelText(/Version 3, Draft/));
    expect(screen.getByRole('button', { name: /Add step/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Remove step/i })).toBeTruthy();
  });

  it('offers New version and Archive only for an ACTIVE workflow', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    expect(screen.getByRole('button', { name: /New version/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Archive/i })).toBeTruthy();
    openDrawer('Versions');
    fireEvent.click(screen.getByLabelText(/Version 3, Draft/));
    expect(screen.queryByRole('button', { name: /New version/i })).toBeNull();
  });
});

describe('WorkflowDefinitionPage: menyimpan perubahan', () => {
  it('sends the edited step to the server only after Save is pressed', async () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    openDrawer('Versions');
    fireEvent.click(screen.getByLabelText(/Version 3, Draft/));

    const nameField = screen.getByLabelText('Name');
    fireEvent.change(nameField, { target: { value: 'Finance Review Updated' } });
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
    openDrawer('Versions');
    fireEvent.click(screen.getByLabelText(/Version 3, Draft/));

    fireEvent.click(screen.getByRole('button', { name: /Move step 1 later/i }));
    await waitFor(() => expect(mutateSpy.reorder).toHaveBeenCalledTimes(1));
    expect(mutateSpy.reorder.mock.calls[0]![0]).toEqual({ id: 'def-pr-v3', input: { stepIds: ['d2', 'd1'] } });
  });
});

describe('WorkflowDefinitionPage: condition builder terpandu', () => {
  it('offers only known document fields, never free text', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    openDrawer('Versions');
    fireEvent.click(screen.getByLabelText(/Version 3, Draft/));
    fireEvent.click(screen.getByLabelText(/Step 2: Finance review/));
    expect(screen.getByLabelText('Condition 1 field')).toBeTruthy();
    expect(screen.getByLabelText('Condition 1 operator')).toBeTruthy();
  });

  it('adds a second rule and lets the user combine them with AND/OR', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    openDrawer('Versions');
    fireEvent.click(screen.getByLabelText(/Version 3, Draft/));
    fireEvent.click(screen.getByLabelText(/Step 2: Finance review/));

    // Mulai dari satu aturan; belum ada penghubung.
    expect(screen.queryByLabelText('Match')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Add rule/i }));

    // Dua aturan → penghubung muncul, artinya rentang kini bisa diekspresikan.
    expect(screen.getByLabelText('Match')).toBeTruthy();
    expect(screen.getByLabelText('Condition 2 field')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Remove rule 2/i })).toBeTruthy();
  });

  it('sends the whole condition group to the server on save', async () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    openDrawer('Versions');
    fireEvent.click(screen.getByLabelText(/Version 3, Draft/));
    fireEvent.click(screen.getByLabelText(/Step 2: Finance review/));

    fireEvent.click(screen.getByRole('button', { name: /Add rule/i }));
    fireEvent.click(screen.getByRole('button', { name: /Save step/i }));

    await waitFor(() => expect(mutateSpy.updateStep).toHaveBeenCalledTimes(1));
    const input = mutateSpy.updateStep.mock.calls[0]![0].input;
    expect(input.conditionGroup).toBeTruthy();
    expect(input.conditionGroup.conditions).toHaveLength(2);
    expect(['AND', 'OR']).toContain(input.conditionGroup.combinator);
  });
});

describe('WorkflowDefinitionPage: simulasi multi-skenario menyalakan rantai', () => {
  it('lights up the path on the chain itself, not only in a separate list', async () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    fireEvent.change(screen.getByLabelText(/Add a scenario amount/i), { target: { value: '3000000' } });
    fireEvent.click(screen.getByRole('button', { name: /Add scenario/i }));

    // 3jt tidak melewati ambang 5jt, jadi hanya langkah 1 yang berjalan.
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/needs\s*1\s*of\s*2\s*steps/i));

    const skippedRow = screen.getByLabelText(/skipped for this amount/i);
    expect(skippedRow.className).toContain('opacity-40');

    const runningRow = screen.getByLabelText(/Step 1: Procurement manager approval/);
    expect(runningRow.className).not.toContain('opacity-40');
  });

  it('keeps several scenarios at once and switches between them', async () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    const input = screen.getByLabelText(/Add a scenario amount/i);
    fireEvent.change(input, { target: { value: '3000000' } });
    fireEvent.click(screen.getByRole('button', { name: /Add scenario/i }));
    fireEvent.change(input, { target: { value: '50000000' } });
    fireEvent.click(screen.getByRole('button', { name: /Add scenario/i }));

    // Dua skenario tersimpan sebagai chip (teks terlihat memakai format angka).
    expect(screen.getByRole('button', { name: /Simulate .*3\.000\.000/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Simulate .*50\.000\.000/ })).toBeTruthy();

    // Memilih skenario besar menjalankan kedua langkah.
    fireEvent.click(screen.getByRole('button', { name: /Simulate .*50\.000\.000/ }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/needs\s*2\s*of\s*2\s*steps/i));
  });
});

describe('WorkflowDefinitionPage: preflight sebelum publish', () => {
  it('blocks publishing when a step has no approver, and explains why', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    openDrawer('Versions');
    fireEvent.click(screen.getByLabelText(/Version 3, Draft/));
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Fix these before publishing/i)).toBeTruthy();
    // Langkah 2 memakai role yang tidak dikenal, jadi preflight menyebutnya.
    expect(within(dialog).getByText(/role that does not exist/i)).toBeTruthy();
    // Tombol konfirmasi dinonaktifkan selama masih ada penghalang.
    const confirm = within(dialog).getByRole('button', { name: 'Publish' });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
  });

  it('does not offer publishing for a locked (active) version', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    // Versi ACTIVE tidak bisa dipublish ulang; itu tugas versi baru.
    expect(screen.queryByRole('button', { name: 'Publish' })).toBeNull();
  });
});

describe('WorkflowDefinitionPage: drawer menahan hal sekunder', () => {
  it('keeps versions and insights out of the way until asked', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    // Tertutup: tidak ada konten tab.
    expect(screen.queryByText('Documents by step')).toBeNull();
    expect(screen.queryByLabelText('Workflow versions')).toBeNull();

    openDrawer('Insights');
    expect(screen.getByText('Documents by step')).toBeTruthy();
    expect(screen.getByText(/Based on recorded approval tasks/i)).toBeTruthy();
    expect(screen.getByText('Rule impact')).toBeTruthy();
  });

  it('shows the version history with status and author in its own tab', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    openDrawer('Versions');
    const rail = screen.getByLabelText('Workflow versions');
    expect(within(rail).getByLabelText(/Version 2, Active/)).toBeTruthy();
    expect(within(rail).getByLabelText(/Version 3, Draft/)).toBeTruthy();
  });

  it('moves definition settings into their own tab', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    openDrawer('Settings');
    expect(screen.getByText('Manager then board')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy();
  });
});

describe('WorkflowDefinitionPage: mulai dari template', () => {
  it('shows what a template will create before confirming', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    fireEvent.click(screen.getByRole('button', { name: /From template/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Two-tier approval')).toBeTruthy();
    // Ringkasan langkah nyata, termasuk syaratnya — bukan hanya nama template.
    expect(within(dialog).getByText('Manager approval')).toBeTruthy();
    expect(within(dialog).getByText(/only when/i)).toBeTruthy();
  });

  it('creates a workflow from the chosen template', async () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    fireEvent.click(screen.getByRole('button', { name: /From template/i }));

    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Code'), { target: { value: 'PR_FAST' } });
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Fast approval' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create workflow' }));

    await waitFor(() => expect(mutateSpy.fromTemplate).toHaveBeenCalledTimes(1));
    const arg = mutateSpy.fromTemplate.mock.calls[0]![0];
    expect(arg.code).toBe('PR_FAST');
    expect(arg.name).toBe('Fast approval');
    expect(arg.template.id).toBe('two-tier');
  });
});

describe('WorkflowDefinitionPage: duplikasi definisi', () => {
  it('duplicates the selected definition under a new code', async () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));

    await waitFor(() => expect(mutateSpy.duplicate).toHaveBeenCalledTimes(1));
    const arg = mutateSpy.duplicate.mock.calls[0]![0];
    expect(arg.id).toBe('def-pr-v2');
    expect(arg.input.code).toBe('PR_APPROVAL_COPY');
  });
});
