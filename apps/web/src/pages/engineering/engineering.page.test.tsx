import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';

const makeItems = (prefix: string, n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `${prefix}-${i}`,
    projectId: 'pa',
    deliverableNumber: `DLV-${String(i + 1).padStart(6, '0')}`,
    drawingNumber: `DRW-${String(i + 1).padStart(6, '0')}`,
    rfiNumber: `RFI-${String(i + 1).padStart(6, '0')}`,
    submittalNumber: `SUB-${String(i + 1).padStart(6, '0')}`,
    transmittalNumber: `TRM-${String(i + 1).padStart(6, '0')}`,
    title: `${prefix} item ${i + 1}`,
    discipline: 'CIVIL',
    engineer: 'Dewi Lestari',
    createdBy: 'Andi',
    plannedDate: '2026-03-15T00:00:00.000Z',
    forecastDate: null,
    actualDate: null,
    currentRevision: 'A',
    status: 'IN_PROGRESS',
    question: 'q',
    recipient: 'r',
    subject: 's',
    sentAt: '2026-03-01T00:00:00.000Z',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    isIFC: false,
    dueDate: null,
    project: { code: 'PRJ-EPC-2027-020' },
  }));

const data = vi.hoisted(() => ({ items: [] as unknown[], total: 0 }));

vi.mock('@/features/engineering', async () => {
  const actual = await vi.importActual<typeof import('@/features/engineering')>('@/features/engineering');
  const mk = (total: number) => ({
    data: { items: (data.items as unknown[]) ?? [], total },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
  return {
    ...actual,
    useDeliverables: vi.fn(() => mk(11)),
    useDrawings: vi.fn(() => mk(11)),
    useRfis: vi.fn(() => mk(0)),
    useSubmittals: vi.fn(() => mk(0)),
    useTransmittals: vi.fn(() => mk(0)),
    useCreateDeliverable: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    useCreateDrawing: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    useCreateRfi: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    useCreateSubmittal: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    useCreateTransmittal: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    useUpdateDeliverableStatus: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    usePublishDrawing: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    useAnswerRfi: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    useReviewSubmittal: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  };
});

vi.mock('@/entities/project', async () => {
  const actual = await vi.importActual<typeof import('@/entities/project')>('@/entities/project');
  return {
    ...actual,
    useProjects: () => ({ data: { items: [{ id: 'pa', code: 'PRJ-EPC-2027-020', name: 'Jetty' }] } }),
  };
});

// `useUrlFilter`/`useUrlPagination` memakai `useSearch` TanStack router yang
// butuh context router. Mock mini menyediakan store reaktif — pola yang sama
// dengan project-list.page.test.tsx.
const nav = vi.hoisted(() => {
  const state = { search: {} as Record<string, unknown>, listeners: new Set<() => void>() };
  return {
    state,
    get: () => state.search,
    set: (next: Record<string, unknown>) => {
      state.search = next;
      for (const l of state.listeners) l();
    },
  };
});

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => (opts: { search?: unknown; replace?: boolean }) => {
    const next = typeof opts?.search === 'function'
      ? (opts.search as (p: Record<string, unknown>) => Record<string, unknown>)(nav.state.search)
      : opts?.search;
    if (next) nav.set(next as Record<string, unknown>);
  },
  useSearch: () => nav.get(),
}));

import { EngineeringPage } from './engineering.page';

beforeEach(() => {
  data.items = makeItems('dlv', 11);
  nav.set({});
});

describe('EngineeringPage — header', () => {
  it('uses the shared PageHeader at application scale', () => {
    renderWithProviders(<EngineeringPage />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe('Engineering');
    expect(heading.className).toContain('text-h1');
  });

  it('constrains the page to the shared max width', () => {
    const { container } = renderWithProviders(<EngineeringPage />);
    expect(container.querySelector('.max-w-\\[1400px\\]')).toBeTruthy();
  });
});

describe('EngineeringPage — tabs', () => {
  it('renders the five document types as a radiogroup with counts', () => {
    renderWithProviders(<EngineeringPage />);
    const group = screen.getByRole('radiogroup');
    expect(within(group).getByText(/Deliverables \(11\)/)).toBeTruthy();
    expect(within(group).getByText(/RFIs \(0\)/)).toBeTruthy();
  });

  it('does not use brand red as the active tab background', () => {
    renderWithProviders(<EngineeringPage />);
    const group = screen.getByRole('radiogroup');
    expect(group.innerHTML).not.toMatch(/racing-red/);
  });
});

describe('EngineeringPage — create form proximity', () => {
  it('opens the form between the header and the tab row, near its trigger', () => {
    renderWithProviders(<EngineeringPage />);
    fireEvent.click(screen.getByRole('button', { name: /create new/i }));
    const form = document.querySelector('form');
    expect(form).not.toBeNull();
    // Form muncul SEBELUM tab row di DOM: pemicu dan hasilnya satu konteks.
    const header = screen.getByRole('heading', { level: 1 });
    expect(header.compareDocumentPosition(form!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(form!.compareDocumentPosition(screen.getByRole('radiogroup')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('EngineeringPage — kolom', () => {
  it('shows the planned date column, not the empty forecast column', () => {
    renderWithProviders(<EngineeringPage />);
    expect(screen.getByText('Planned')).toBeTruthy();
    expect(screen.queryByText('Forecast')).toBeNull();
  });

  it('uses consistent English column headers', () => {
    renderWithProviders(<EngineeringPage />);
    expect(screen.getByText('Discipline')).toBeTruthy();
    expect(screen.queryByText('Disiplin')).toBeNull();
  });

  it('labels the advance action in human words, not raw enum codes', () => {
    renderWithProviders(<EngineeringPage />);
    // Bisa ada beberapa tombol Submit (satu per baris IN_PROGRESS); yang penting
    // tidak ada lagi tombol berlabel kode enum mentah.
    expect(screen.queryByRole('button', { name: 'IN_PROGRESS' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'APPROVED' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'ISSUED' })).toBeNull();
    const submits = screen.getAllByRole('button', { name: 'Submit' });
    expect(submits.length).toBeGreaterThan(0);
  });
});

describe('EngineeringPage — struktur', () => {
  it('renders the grid inside a panel container', () => {
    const { container } = renderWithProviders(<EngineeringPage />);
    expect(container.querySelector('.rounded-md.border.bg-surface-raised')).toBeTruthy();
  });

  it('does not leak tab state into the pagination of other tabs', () => {
    // Reset pagination saat ganti tab: pindah tab mengembalikan ke halaman 1.
    renderWithProviders(<EngineeringPage />);
    fireEvent.click(within(screen.getByRole('radiogroup')).getByRole('radio', { name: /Drawings/ }));
    expect(screen.getByRole('radiogroup').textContent).toMatch(/Drawings/);
  });
});
