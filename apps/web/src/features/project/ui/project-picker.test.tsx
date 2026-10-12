import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { ProjectPicker } from './project-picker';

const { useProjectsMock } = vi.hoisted(() => ({ useProjectsMock: vi.fn() }));

vi.mock('@/entities/project', () => ({
  useProjects: (params: { search?: string }) => useProjectsMock(params),
}));

const projects = [
  { id: 'p1', code: 'PRJ-EPC-2027-030', name: 'Feasibility & Basic Eng.', client: 'PT Marine Nusantara', status: 'ACTIVE' },
  { id: 'p2', code: 'PRJ-EPC-2027-014', name: 'EPC Industrial Processing Facility', client: 'PT Klien Utama', status: 'ACTIVE' },
];

describe('ProjectPicker', () => {
  beforeEach(() => {
    useProjectsMock.mockReset();
    useProjectsMock.mockReturnValue({ data: { items: projects }, isLoading: false, isError: false });
  });

  it('shows the selected project on the trigger', () => {
    renderWithProviders(<ProjectPicker value="p2" onValueChange={vi.fn()} />);
    expect(screen.getByText(/EPC Industrial Processing Facility/)).toBeTruthy();
  });

  it('opens a listbox with code, name, client and status per option', () => {
    renderWithProviders(<ProjectPicker value="" onValueChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox')).toBeTruthy();
    expect(screen.getByText('PRJ-EPC-2027-030')).toBeTruthy();
    expect(screen.getAllByText(/PT Marine Nusantara/).length).toBeGreaterThan(0);
  });

  it('queries the server with the typed search term', async () => {
    renderWithProviders(<ProjectPicker value="" onValueChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'marine' } });
    await waitFor(() => expect(useProjectsMock).toHaveBeenCalledWith(expect.objectContaining({ search: 'marine' })));
  });

  it('selects the first option with Enter', () => {
    const onValueChange = vi.fn();
    renderWithProviders(<ProjectPicker value="" onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
    expect(onValueChange).toHaveBeenCalledWith('p1');
  });

  it('moves the highlight with ArrowDown before selecting', () => {
    const onValueChange = vi.fn();
    renderWithProviders(<ProjectPicker value="" onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole('combobox'));
    const combo = screen.getByRole('combobox');
    fireEvent.keyDown(combo, { key: 'ArrowDown' });
    fireEvent.keyDown(combo, { key: 'Enter' });
    expect(onValueChange).toHaveBeenCalledWith('p2');
  });

  it('shows an honest empty message when nothing matches', () => {
    useProjectsMock.mockReturnValue({ data: { items: [] }, isLoading: false, isError: false });
    renderWithProviders(<ProjectPicker value="" onValueChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'zzz' } });
    expect(screen.getByText(/No project matches/i)).toBeTruthy();
  });

  it('closes the listbox on Escape', () => {
    renderWithProviders(<ProjectPicker value="" onValueChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox')).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
