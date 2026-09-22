import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { WbsForm } from './wbs-form';

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock('@/entities/wbs', () => ({
  useCreateWbsItem: () => ({ mutate, isPending: false, isError: false }),
}));

describe('WbsForm', () => {
  beforeEach(() => mutate.mockClear());

  it('menolak submit saat kode kosong', async () => {
    renderWithProviders(<WbsForm projectId="p1" projectCode="PRJ-1" tree={[]} onDone={vi.fn()} />);
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(mutate).not.toHaveBeenCalled());
  });

  it('submit payload termasuk parentId', async () => {
    renderWithProviders(
      <WbsForm projectId="p1" parentId="wbs-parent" projectCode="PRJ-1" tree={[]} onDone={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText(/Kode WBS/), { target: { value: '1.1' } });
    fireEvent.change(screen.getByLabelText(/Nama/), { target: { value: 'Detail Engineering' } });
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate.mock.calls.at(0)?.at(0)).toEqual({
      code: '1.1',
      name: 'Detail Engineering',
      parentId: 'wbs-parent',
    });
  });

  it('submit tanpa parentId saat root', async () => {
    renderWithProviders(<WbsForm projectId="p1" projectCode="PRJ-1" tree={[]} onDone={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Kode WBS/), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/Nama/), { target: { value: 'Root WBS' } });
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate.mock.calls.at(0)?.at(0)).toEqual({
      code: '1',
      name: 'Root WBS',
      parentId: undefined,
    });
  });
});
