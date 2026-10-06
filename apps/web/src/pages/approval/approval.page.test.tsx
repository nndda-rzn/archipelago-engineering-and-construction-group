import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSyncExternalStore } from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';

// Router mini: meniru useSearch/useNavigate agar filter URL benar-benar reaktif.
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

const decideSpy = vi.hoisted(() => ({ mutate: vi.fn(), isPending: false }));
const bulkSpy = vi.hoisted(() => ({ mutate: vi.fn(), isPending: false }));

const queue = vi.hoisted(() => ({
  items: [
    {
      id: 't1',
      transactionType: 'PurchaseRequisition',
      transactionId: 'pr1',
      transactionCode: 'PR-2027-EPC-000014',
      stepOrder: 2,
      stepName: 'Approval Direksi',
      status: 'PENDING',
      requesterId: 'other',
      approverId: null,
      approverRoleCode: 'PROCUREMENT_MANAGER',
      comment: null,
      decidedAt: null,
      createdAt: '2026-10-04T12:00:00.000Z',
      canApprove: true,
      projectCode: 'PRJ-01',
      projectName: 'Tower B',
      amount: 1_240_000_000,
      requesterName: 'Andi',
    },
    {
      id: 't2',
      transactionType: 'PurchaseOrder',
      transactionId: 'po1',
      transactionCode: 'PO-2027-EPC-000088',
      stepOrder: 1,
      stepName: 'Approval Manager Pengadaan',
      status: 'PENDING',
      requesterId: 'other',
      approverId: null,
      approverRoleCode: 'PROCUREMENT_MANAGER',
      comment: null,
      decidedAt: null,
      createdAt: '2026-09-28T12:00:00.000Z',
      canApprove: true,
      projectCode: 'PRJ-02',
      projectName: 'Pipeline',
      amount: 480_000_000,
      requesterName: 'Rina',
    },
  ],
  total: 2,
  counts: { PENDING: 2, APPROVED: 40, REJECTED: 3, ALL: 45 },
}));

vi.mock('@/features/approval', async () => {
  const actual = await vi.importActual<typeof import('@/features/approval')>('@/features/approval');
  return {
    ...actual,
    useApprovalQueue: () => ({ data: queue, isLoading: false, isError: false, refetch: vi.fn() }),
    useApprovalDetail: () => ({
      data: {
        task: { ...queue.items[0], stepOrder: 2, stepName: 'Approval Direksi' },
        document: {
          type: 'PurchaseRequisition',
          code: 'PR-2027-EPC-000014',
          amount: 1_240_000_000,
          currency: 'IDR',
          description: 'Cement for Tower B',
          projectCode: 'PRJ-01',
          projectName: 'Tower B',
          vendor: null,
          requesterName: 'Andi',
          items: [
            { description: 'Semen PC-40', quantity: 500, unit: 'bag', unitPrice: 60_000, totalPrice: 30_000_000, wbsCode: '2' },
            { description: 'Besi D13', quantity: 2000, unit: 'kg', unitPrice: 12_000, totalPrice: 24_000_000, wbsCode: '1' },
          ],
        },
        history: [
          { action: 'APPROVAL.SUBMIT', actorId: 'u-andi', actorName: 'Andi', comment: null, at: '2026-10-04T12:00:00.000Z' },
        ],
        budget: { budget: 3_000_000_000, commitment: 150_000_000, existingPr: 0, remaining: 2_000_000_000, within: true },        chain: [
          { stepOrder: 1, name: 'Approval Manager Pengadaan', approverRoleCode: 'PROCUREMENT_MANAGER', condition: null, status: 'done' },
          { stepOrder: 2, name: 'Approval Direksi', approverRoleCode: 'SUPER_ADMIN', condition: 'estimatedTotal > 5.000.000', status: 'current' },
        ],
        project: {
          code: 'PRJ-01', name: 'Tower B', client: 'PT Klien', status: 'ACTIVE', contractValue: 5_000_000_000,
          startDate: '2026-01-01T00:00:00.000Z', completionDate: '2027-01-01T00:00:00.000Z', location: 'Jakarta', manager: 'Budi',
          baselineByCostType: [{ costType: 'MATERIAL', amount: 300_000_000 }, { costType: 'LABOR', amount: 100_000_000 }],
        },
        vendor: null,
        related: [{ type: 'PurchaseOrder', code: 'PO-1', status: 'RELEASED' }],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }),
    useDecideApproval: () => decideSpy,
    useBulkDecideApproval: () => bulkSpy,
  };
});

vi.mock('@aec/ui', async () => {
  const actual = await vi.importActual<typeof import('@aec/ui')>('@aec/ui');
  return { ...actual, useToast: () => vi.fn() };
});

import { ApprovalPage } from './approval.page';

beforeEach(() => {
  nav.set({});
  decideSpy.mutate.mockClear();
  bulkSpy.mutate.mockClear();
});

describe('ApprovalPage — identitas & ringkasan', () => {
  it('states what the page is (title + inbox subtitle)', () => {
    renderWithProviders(<ApprovalPage />);
    expect(screen.getByRole('heading', { name: 'Approval', level: 1 })).toBeTruthy();
    expect(screen.getByText(/Approval inbox/i)).toBeTruthy();
  });

  it('shows a working summary derived from real data', () => {
    renderWithProviders(<ApprovalPage />);
    const summary = screen.getByTestId('approval-summary');
    expect(within(summary).getByText(/awaiting your decision/i)).toBeTruthy();
    expect(within(summary).getByText(/overdue/i)).toBeTruthy();
    expect(within(summary).getByText(/you can approve/i)).toBeTruthy();
  });

  it('labels the status tabs with real counts', () => {
    renderWithProviders(<ApprovalPage />);
    expect(screen.getByRole('radio', { name: /Pending 2/ })).toBeTruthy();
    expect(screen.getByRole('radio', { name: /Approved 40/ })).toBeTruthy();
  });
});

describe('ApprovalPage — queue & detail', () => {
  it('renders queue rows with code, amount and aging text (not colour alone)', () => {
    renderWithProviders(<ApprovalPage />);
    expect(screen.getByText('PR-2027-EPC-000014')).toBeTruthy();
    expect(screen.getByText(/Rp\s?1\.240\.000\.000/)).toBeTruthy();
    expect(screen.getAllByText(/Overdue/).length).toBeGreaterThan(0);
  });

  it('prompts to select a task before any decision', () => {
    renderWithProviders(<ApprovalPage />);
    expect(screen.getByText(/Select a task to review/i)).toBeTruthy();
  });

  it('opens the document detail when a task is chosen and writes it to the URL', () => {
    renderWithProviders(<ApprovalPage />);
    fireEvent.click(screen.getByRole('button', { name: /PR-2027-EPC-000014/ }));
    expect(nav.get().task).toBe('t1');
    expect(screen.getByText('Semen PC-40')).toBeTruthy();
  });
});

describe('ApprovalPage — rich detail context', () => {
  const openTask = () => fireEvent.click(screen.getByRole('button', { name: /PR-2027-EPC-000014/ }));

  it('shows the budget impact with an explicit within/exceeds verdict', () => {
    const { container } = renderWithProviders(<ApprovalPage />);
    openTask();
    expect(screen.getByLabelText('Budget impact')).toBeTruthy();
    // Verdict eksplisit sebagai teks — bukan hanya warna.
    expect(container.textContent).toMatch(/Within budget/i);
    expect(container.textContent).toMatch(/Committed/);
  });
  it('shows the approval chain with step states derived from real data', () => {
    const { container } = renderWithProviders(<ApprovalPage />);
    openTask();
    expect(screen.getByLabelText('Approval chain')).toBeTruthy();
    expect(container.textContent).toMatch(/step 2 of 2/i);
    expect(container.textContent).toMatch(/you are here/i);
    expect(container.textContent).toMatch(/estimatedTotal > 5\.000\.000/);
  });

  it('labels the cost-type breakdown as the project baseline, not this document', () => {
    renderWithProviders(<ApprovalPage />);
    openTask();
    expect(screen.getByText(/Project baseline by cost type/i)).toBeTruthy();
    expect(screen.getByText(/not this document/i)).toBeTruthy();
  });

  it('shows related documents as links without claiming invoice matching', () => {
    renderWithProviders(<ApprovalPage />);
    openTask();
    const related = screen.getByLabelText('Related documents');
    expect(within(related).getByText('PO-1')).toBeTruthy();
    expect(within(related).getByText(/matching is not evaluated/i)).toBeTruthy();
  });
});

describe('ApprovalPage — reject requires a reason', () => {
  it('keeps the reject action blocked until a reason is entered', async () => {
    renderWithProviders(<ApprovalPage />);
    fireEvent.click(screen.getByRole('button', { name: /PR-2027-EPC-000014/ }));

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /Reject request/i }));

    // Tanpa alasan: tidak ada mutasi, dan error tampil.
    expect(decideSpy.mutate).not.toHaveBeenCalled();
    expect(within(dialog).getByRole('alert')).toBeTruthy();

    fireEvent.change(within(dialog).getByLabelText(/Reason for rejection/i), { target: { value: 'Budget exceeded' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Reject request/i }));

    await waitFor(() =>
      expect(decideSpy.mutate).toHaveBeenCalledWith(
        expect.objectContaining({ taskId: 't1', decision: 'REJECT', comment: 'Budget exceeded' }),
        expect.anything(),
      ),
    );
  });
});

describe('ApprovalPage — bulk actions', () => {
  it('reveals a contextual action bar only after selecting rows', () => {
    renderWithProviders(<ApprovalPage />);
    expect(screen.queryByTestId('bulk-selected-count')).toBeNull();
    fireEvent.click(screen.getByLabelText('Select PR-2027-EPC-000014'));
    expect(screen.getByTestId('bulk-selected-count').textContent).toMatch(/1\s*selected/i);
    expect(screen.getByRole('button', { name: /Approve selected/i })).toBeTruthy();
  });

  it('sends the selected ids to the bulk endpoint after confirmation', async () => {
    renderWithProviders(<ApprovalPage />);
    fireEvent.click(screen.getByLabelText('Select PR-2027-EPC-000014'));
    fireEvent.click(screen.getByRole('button', { name: /Approve selected/i }));

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /Approve selected/i }));

    await waitFor(() =>
      expect(bulkSpy.mutate).toHaveBeenCalledWith(
        expect.objectContaining({ taskIds: ['t1'], decision: 'APPROVE' }),
        expect.anything(),
      ),
    );
  });
});
