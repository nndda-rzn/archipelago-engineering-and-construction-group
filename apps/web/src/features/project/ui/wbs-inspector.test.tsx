import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { WbsInspector } from './wbs-inspector';
import type { WbsItem } from '@aec/api-contracts';

const { updateMutate, deleteMutate } = vi.hoisted(() => ({ updateMutate: vi.fn(), deleteMutate: vi.fn() }));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: { children?: React.ReactNode }) => <a {...props}>{children}</a>,
}));

vi.mock('@/entities/wbs', () => ({
  useUpdateWbsItem: () => ({ mutate: updateMutate, isPending: false, isError: false }),
  useDeleteWbsItem: () => ({ mutate: deleteMutate, isPending: false, isError: false, error: null }),
  useWbsLinks: () => ({ data: { itemId: 'w1', total: 14, links: [{ key: 'poItems', label: 'purchase order items', count: 12 }, { key: 'costCodes', label: 'cost codes', count: 2 }] }, isLoading: false, isError: false }),
}));

const item: WbsItem = {
  id: 'w1', code: '1.1', name: 'Detail Engineering', description: 'Design package', sortOrder: 1,
  progressPercent: 40, plannedStart: '2026-01-05T00:00:00.000Z', plannedEnd: null,
  responsibleManager: 'Ahmad', isMilestone: false,
  rollup: { budget: 1_100_000_000, actual: 400_000_000, progress: 40, childCount: 0 },
  children: [],
};

describe('WbsInspector', () => {
  beforeEach(() => {
    updateMutate.mockClear();
    deleteMutate.mockClear();
  });

  it('saves edited progress through PATCH', async () => {
    renderWithProviders(<WbsInspector projectId="p1" item={item} onDeleted={vi.fn()} />);
    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '55' } });
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1));
    expect(updateMutate.mock.calls[0]![0]).toMatchObject({ itemId: 'w1', input: expect.objectContaining({ progressPercent: 55 }) });
  });

  it('groups the slider and number as one labelled control', () => {
    renderWithProviders(<WbsInspector projectId="p1" item={item} onDeleted={vi.fn()} />);
    expect(screen.getByRole('group', { name: 'Progress %' })).toBeTruthy();
  });

  it('does not paint the progress control in the action colour', () => {
    renderWithProviders(<WbsInspector projectId="p1" item={item} onDeleted={vi.fn()} />);
    const slider = screen.getByLabelText('Progress slider');
    expect(slider.className).not.toContain('racing-red');
    expect(slider.className).toContain('accent-neutral-800');
  });

  it('labels the rollup block in plain language, not jargon', () => {
    renderWithProviders(<WbsInspector projectId="p1" item={item} onDeleted={vi.fn()} />);
    expect(screen.getByText(/Derived from children/i)).toBeTruthy();
  });

  it('shows rollup as read-only, separate from the inputs', () => {
    renderWithProviders(<WbsInspector projectId="p1" item={item} onDeleted={vi.fn()} />);
    expect(screen.getByText(/Budget/i)).toBeTruthy();
    // Rollup budget is rendered compact (Rp 1,1 M), not as an editable field.
    expect(screen.getAllByText(/Rp/).length).toBeGreaterThan(0);
  });

  it('lists linked documents with their counts', () => {
    renderWithProviders(<WbsInspector projectId="p1" item={item} onDeleted={vi.fn()} />);
    expect(screen.getByText(/purchase order items/i)).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
  });

  it('confirms before deleting', async () => {
    renderWithProviders(<WbsInspector projectId="p1" item={item} onDeleted={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Delete/i }));
    const confirm = await screen.findByRole('button', { name: /^Delete$/i });
    fireEvent.click(confirm);
    await waitFor(() => expect(deleteMutate).toHaveBeenCalledWith('w1', expect.anything()));
  });
});
