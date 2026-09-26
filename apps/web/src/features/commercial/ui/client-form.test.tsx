import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { ClientForm } from './client-form';

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock('../model/commercial.api', () => ({
  useCreateClient: () => ({ mutate, isPending: false, isError: false }),
}));

describe('ClientForm', () => {
  beforeEach(() => mutate.mockClear());

  it('menolak submit saat nama kosong (validasi zod)', async () => {
    renderWithProviders(<ClientForm onDone={vi.fn()} />);
    fireEvent.click(screen.getByText('Create Client'));
    await waitFor(() => expect(mutate).not.toHaveBeenCalled());
    expect(screen.getByText(/at least 2/i)).toBeTruthy();
  });

  it('menolak email tidak valid', async () => {
    renderWithProviders(<ClientForm onDone={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Client Name/), { target: { value: 'PT Klien' } });
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'bukan-email' } });
    fireEvent.click(screen.getByText('Create Client'));
    await waitFor(() => expect(mutate).not.toHaveBeenCalled());
  });

  it('submit payload benar dengan field opsional kosong jadi undefined', async () => {
    const onDone = vi.fn();
    renderWithProviders(<ClientForm onDone={onDone} />);
    fireEvent.change(screen.getByLabelText(/Client Name/), { target: { value: 'PT Klien Utama' } });
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'kontak@klien.id' } });
    fireEvent.click(screen.getByText('Create Client'));
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    const payload = mutate.mock.calls.at(0)?.at(0);
    expect(payload).toEqual({
      name: 'PT Klien Utama',
      industry: undefined,
      contactPerson: undefined,
      email: 'kontak@klien.id',
    });
  });
});
