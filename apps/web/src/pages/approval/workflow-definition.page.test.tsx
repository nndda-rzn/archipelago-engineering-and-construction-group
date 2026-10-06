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

vi.mock('@/features/approval', async () => {
  const actual = await vi.importActual<typeof import('@/features/approval')>('@/features/approval');
  return {
    ...actual,
    useWorkflowDefinitions: () => ({ data: defs, isLoading: false, isError: false, refetch: vi.fn() }),
    useWorkflowVersions: () => ({
      data: [
        { id: 'def-pr-v3', code: 'PR_APPROVAL', version: 3, status: 'DRAFT', name: 'Purchase requisition approval', stepCount: 2, createdByName: 'AEC Administrator', createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z', isActive: false },
        { id: 'def-pr-v2', code: 'PR_APPROVAL', version: 2, status: 'ACTIVE', name: 'Purchase requisition approval', stepCount: 2, createdByName: 'AEC Administrator', createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z', isActive: true },
      ],
      isLoading: false, isError: false, refetch: vi.fn(),
    }),
    useWorkflowVersionDiff: () => ({
      data: {
        from: { id: 'def-pr-v2', code: 'PR_APPROVAL', version: 2, status: 'ACTIVE', name: 'Purchase requisition approval', stepCount: 2, createdByName: 'AEC Administrator', createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z', isActive: true },
        to: { id: 'def-pr-v3', code: 'PR_APPROVAL', version: 3, status: 'DRAFT', name: 'Purchase requisition approval', stepCount: 2, createdByName: 'AEC Administrator', createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z', isActive: false },
        added: [], removed: [],
        changed: [{ stepOrder: 2, fields: [{ field: 'name', from: 'Board approval', to: 'Finance review' }] }],
      },
      isLoading: false, isError: false,
    }),
    useWorkflowInsights: () => ({
      data: {
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

describe('WorkflowDefinitionPage: struktur & identitas', () => {
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

describe('WorkflowDefinitionPage: pemegang role tampil sebagai orang', () => {
  it('names the people who can approve, not just how many', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    // Versi ACTIVE: step 1 dipegang satu orang, step 2 dipegang dua orang.
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
    // Kode tetap ada supaya dokumen bisa dirujuk, tapi bukan judul.
    const detail = screen.getByLabelText('Workflow detail');
    expect(within(detail).getAllByText('PR_APPROVAL').length).toBeGreaterThanOrEqual(1);
  });

  it('uses the readable name in the list too', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    const list = screen.getByLabelText('Workflow definitions');
    expect(within(list).getAllByText('Purchase requisition approval').length).toBe(2);
  });
});

describe('WorkflowDefinitionPage: versi sebagai tangga', () => {
  it('marks only the in-use version with a filled dot', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    const rail = screen.getByLabelText('Workflow versions');
    const dots = rail.querySelectorAll('[data-slot="version-dot"]');
    expect(dots.length).toBe(2);
    const filled = rail.querySelectorAll('[data-slot="version-dot"][data-in-use="true"]');
    expect(filled.length).toBe(1);
  });
});

describe('WorkflowDefinitionPage: ambang terlihat', () => {
  it('shows the real threshold of each conditional step', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    expect(screen.getByText('Approval thresholds')).toBeTruthy();
    expect(screen.getByText(/above\s*5\.000\.000/i)).toBeTruthy();
  });
});

describe('WorkflowDefinitionPage: pipeline sebagai alur', () => {
  it('renders each step as a node with its role and holder count', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    expect(screen.getByLabelText(/Step 1: Procurement manager approval/)).toBeTruthy();
    expect(screen.getByLabelText(/Step 2: Board approval/)).toBeTruthy();
  });

  it('flags a step whose approver role nobody holds', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    // Default membuka versi ACTIVE; versi DRAFT punya role tanpa pemegang.
    fireEvent.click(screen.getByLabelText(/Version 3, Draft/));
    expect(screen.getByText(/No approver, so the chain will stall/i)).toBeTruthy();
  });

  it('offers a table view of the same chain (diagram ⇄ table)', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    fireEvent.click(screen.getByRole('radio', { name: 'Table' }));
    expect(screen.getByRole('table', { name: /Approval steps/i })).toBeTruthy();
  });
});

describe('WorkflowDefinitionPage: rantai sebagai alur', () => {
  it('renders each step as a row with its role and holder count', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    expect(screen.getByLabelText(/Step 1: Procurement manager approval/)).toBeTruthy();
    expect(screen.getByLabelText(/Step 2: Board approval/)).toBeTruthy();
  });

  it('brackets the chain with a trigger and a result so it reads as a process', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    expect(screen.getByText(/Purchase requisition submitted/i)).toBeTruthy();
    expect(screen.getByText(/Purchase requisition approved/i)).toBeTruthy();
  });

  it('marks the spine dashed only where the next step is conditional', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    const pipeline = document.querySelector('[data-slot="workflow-pipeline"]')!;
    // ACTIVE v2: step 1 tanpa syarat, step 2 bersyarat → tepat satu segmen putus.
    const dashed = pipeline.querySelectorAll('[data-slot="spine-dashed"]');
    const solid = pipeline.querySelectorAll('[data-slot="spine-solid"]');
    expect(dashed.length).toBe(1);
    expect(solid.length).toBeGreaterThan(0);
    // Gerbangnya menyebut syaratnya, bukan sekadar garis tanpa keterangan.
    expect(within(pipeline as HTMLElement).getByText(/only when/i)).toBeTruthy();
  });

  it('groups by space, not by borders (strip-the-borders check)', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    const stepRow = screen.getByLabelText(/Step 1: Procurement manager approval/);
    // Baris langkah tidak memakai border sebagai pengelompok: hanya garis kiri
    // penanda terpilih, tanpa kotak penuh.
    expect(stepRow.className).toContain('border-l-2');
    expect(stepRow.className).not.toContain('border ');
    expect(stepRow.className).not.toMatch(/rounded-md border border-neutral/);
  });

  it('uses a graded spacing rhythm instead of one uniform gap', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    const detail = screen.getByLabelText('Workflow detail');
    // Zona dipisah 48px (space-y-12), bukan 24px seragam seperti sebelumnya.
    const zone = detail.querySelector(':scope > div.space-y-12');
    expect(zone).toBeTruthy();
    // Rantai dan editor berdampingan (grid), bukan bertumpuk dengan jarak sama.
    expect(zone?.querySelector('div.grid.xl\\:grid-cols-\\[minmax\\(0\\,1fr\\)_minmax\\(0\\,22rem\\)\\]')).toBeTruthy();
  });

  it('flags a step whose approver role nobody holds', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    fireEvent.click(screen.getByLabelText(/Version 3, Draft/));
    expect(screen.getByText(/No approver, so the chain will stall/i)).toBeTruthy();
  });

  it('offers a table view of the same chain (flow and table)', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    fireEvent.click(screen.getByRole('radio', { name: 'Table' }));
    expect(screen.getByRole('table', { name: /Approval steps/i })).toBeTruthy();
  });
});

describe('WorkflowDefinitionPage: satu aksi primer', () => {
  it('makes Publish the only primary button on a draft', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    fireEvent.click(screen.getByLabelText(/Version 3, Draft/));
    const primary = Array.from(document.querySelectorAll('button')).filter((b) =>
      b.className.includes('bg-racing-red-600'),
    );
    expect(primary.map((b) => b.textContent?.trim())).toEqual(['Publish']);
  });

  it('does not use the primary treatment for archive or delete', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    // ACTIVE: New version + Archive tersedia, keduanya bukan aksi primer.
    for (const label of [/New version/i, /Archive/i]) {
      const btn = screen.getByRole('button', { name: label });
      expect(btn.className).not.toContain('bg-racing-red-600');
    }
  });
});

describe('WorkflowDefinitionPage: rantai & editor sebidang', () => {
  it('keeps the chain visible while a step is selected for editing', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    fireEvent.click(screen.getByLabelText(/Version 3, Draft/));
    fireEvent.click(screen.getByLabelText(/Step 2: Finance review/));
    // Keduanya ada di DOM yang sama: memilih langkah tidak menyembunyikan rantai.
    expect(screen.getByLabelText(/Step 1: Procurement manager approval/)).toBeTruthy();
    expect(screen.getByLabelText('Name')).toBeTruthy();
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

describe('WorkflowDefinitionPage: menyimpan perubahan', () => {
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

describe('WorkflowDefinitionPage: condition builder terpandu', () => {
  it('offers only known document fields, never free text', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    fireEvent.click(screen.getByLabelText(/Version 3, Draft/));
    // Pilih langkah yang memang bersyarat (langkah 2 versi draft).
    fireEvent.click(screen.getByLabelText(/Step 2: Finance review/));
    // Kontrol berupa pilihan, bukan input teks bebas.
    expect(screen.getByLabelText('Condition field')).toBeTruthy();
    expect(screen.getByLabelText('Condition operator')).toBeTruthy();
  });
});

describe('WorkflowDefinitionPage: simulasi menyalakan rantai', () => {
  it('lights up the path on the chain itself, not only in a separate list', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    fireEvent.change(screen.getByLabelText(/Document amount/i), { target: { value: '3000000' } });

    // 3jt tidak melewati ambang 5jt, jadi hanya langkah 1 yang berjalan.
    expect(screen.getByRole('status').textContent).toMatch(/needs\s*1\s*of\s*2\s*steps/i);

    const pipeline = document.querySelector('[data-slot="workflow-pipeline"]')!;
    const skipped = pipeline.querySelectorAll('[data-slot="step-marker"][data-skipped="true"]');
    expect(skipped.length).toBe(1);

    // Diredupkan, bukan hanya ditandai: jalur terlihat tetapi aksinya resesif.
    const skippedRow = screen.getByLabelText(/skipped for this amount/i);
    expect(skippedRow.className).toContain('opacity-45');

    // Langkah yang berjalan tetap penuh.
    const runningRow = screen.getByLabelText(/Step 1: Procurement manager approval/);
    expect(runningRow.className).not.toContain('opacity-45');
  });

  it('marks the skipped step in its accessible name, not by dimming alone', () => {
    renderWithProviders(<WorkflowDefinitionPage />);
    fireEvent.change(screen.getByLabelText(/Document amount/i), { target: { value: '3000000' } });
    expect(screen.getByLabelText(/skipped for this amount/i)).toBeTruthy();
  });
});

describe('WorkflowDefinitionPage: versi & insight', () => {
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
