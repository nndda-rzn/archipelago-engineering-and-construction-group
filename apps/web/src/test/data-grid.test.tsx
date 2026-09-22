import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createColumnHelper } from '@tanstack/react-table';
import { DataGrid } from '@aec/ui';

type Row = { id: string; name: string };

const columnHelper = createColumnHelper<Row>();
const columns = [
  columnHelper.accessor('name', { header: 'Nama', cell: (i) => i.getValue() }),
];

const rows: Row[] = [
  { id: 'r1', name: 'Baris Satu' },
  { id: 'r2', name: 'Baris Dua' },
];

describe('DataGrid', () => {
  it('render skeleton saat isLoading', () => {
    render(<DataGrid columns={columns} data={[]} isLoading />);
    expect(screen.getByLabelText('Memuat data')).toBeTruthy();
  });

  it('render error state + retry memanggil onRetry', () => {
    const onRetry = vi.fn();
    render(<DataGrid columns={columns} data={[]} isError onRetry={onRetry} />);
    expect(screen.getByText('Gagal memuat data')).toBeTruthy();
    fireEvent.click(screen.getByText('Coba lagi'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('render emptyMessage saat data kosong', () => {
    render(<DataGrid columns={columns} data={[]} emptyMessage="Belum ada data" />);
    expect(screen.getByText('Belum ada data')).toBeTruthy();
  });

  it('render baris data', () => {
    render(<DataGrid columns={columns} data={rows} />);
    expect(screen.getByText('Baris Satu')).toBeTruthy();
    expect(screen.getByText('Baris Dua')).toBeTruthy();
  });

  it('menandai baris terpilih via aria-selected + getRowId', () => {
    render(<DataGrid columns={columns} data={rows} selectedRowId="r2" getRowId={(r) => r.id} />);
    const selected = screen.getByText('Baris Dua').closest('tr');
    const other = screen.getByText('Baris Satu').closest('tr');
    expect(selected?.getAttribute('aria-selected')).toBe('true');
    expect(other?.getAttribute('aria-selected')).toBe('false');
  });

  it('header kolom sortable ber-scope=col + aria-sort', () => {
    render(<DataGrid columns={columns} data={rows} sorting={[]} onSortingChange={vi.fn()} />);
    const th = screen.getByText('Nama').closest('th');
    expect(th?.getAttribute('scope')).toBe('col');
    expect(th?.getAttribute('aria-sort')).toBe('none');
  });
});
