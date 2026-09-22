import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { WarehouseForm } from './warehouse-form';

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock('../model/warehouse.api', () => ({
  useCreateWarehouse: () => ({ mutate, isPending: false, isError: false }),
}));

describe('WarehouseForm', () => {
  beforeEach(() => mutate.mockClear());

  it('menolak submit saat kode & nama kosong', async () => {
    renderWithProviders(<WarehouseForm onDone={vi.fn()} />);
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(mutate).not.toHaveBeenCalled());
  });

  it('menolak kode terlalu pendek (< 2 karakter)', async () => {
    renderWithProviders(<WarehouseForm onDone={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Kode/), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText(/Nama/), { target: { value: 'Gudang A' } });
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(mutate).not.toHaveBeenCalled());
  });

  it('submit payload default warehouseType PROJECT + location undefined', async () => {
    renderWithProviders(<WarehouseForm onDone={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Kode/), { target: { value: 'WH-01' } });
    fireEvent.change(screen.getByLabelText(/Nama/), { target: { value: 'Gudang Proyek' } });
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate.mock.calls.at(0)?.at(0)).toEqual({
      code: 'WH-01',
      name: 'Gudang Proyek',
      warehouseType: 'PROJECT',
      location: undefined,
    });
  });
});
