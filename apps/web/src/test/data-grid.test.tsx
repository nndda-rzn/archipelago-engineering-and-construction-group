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
    expect(screen.getByLabelText('Loading data')).toBeTruthy();
  });

  it('render error state + retry memanggil onRetry', () => {
    const onRetry = vi.fn();
    render(<DataGrid columns={columns} data={[]} isError onRetry={onRetry} />);
    expect(screen.getByText('Failed to load data')).toBeTruthy();
    fireEvent.click(screen.getByText('Try again'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('render emptyMessage saat data kosong', () => {
    render(<DataGrid columns={columns} data={[]} emptyMessage="Nothing here yet" />);
    expect(screen.getByText('Nothing here yet')).toBeTruthy();
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

  it('menerapkan lebar kolom via size dan tidak membungkus header', () => {
    const sized = [columnHelper.accessor('name', { header: 'Nama', size: 180, cell: (i) => i.getValue() })];
    render(<DataGrid columns={sized} data={rows} />);
    const th = screen.getByText('Nama').closest('th');
    expect(th?.style.minWidth).toBe('180px');
    expect(th?.className).toContain('whitespace-nowrap');
  });

  it('merata-kanan sel numerik lewat meta.align', () => {
    const right = [columnHelper.accessor('name', { header: 'Nama', meta: { align: 'right' }, cell: (i) => i.getValue() })];
    render(<DataGrid columns={right} data={rows} />);
    const th = screen.getByText('Nama').closest('th');
    const td = screen.getByText('Baris Satu').closest('td');
    expect(th?.className).toContain('text-right');
    expect(td?.className).toContain('text-right');
  });

  it('renders every row when clientPagination is off (no behaviour change)', () => {
    const many: Row[] = Array.from({ length: 12 }).map((_, i) => ({ id: `r${i}`, name: `Row ${i}` }));
    render(<DataGrid columns={columns} data={many} />);
    expect(screen.getByText('Row 11')).toBeTruthy();
    expect(screen.queryByText('Previous')).toBeNull();
  });

  it('caps rows at pageSize and shows pager when clientPagination is on', () => {
    const many: Row[] = Array.from({ length: 12 }).map((_, i) => ({ id: `r${i}`, name: `Row ${i}` }));
    render(<DataGrid columns={columns} data={many} clientPagination pageSize={5} />);
    // Hanya 5 baris pertama yang ter-render.
    expect(screen.getByText('Row 0')).toBeTruthy();
    expect(screen.getByText('Row 4')).toBeTruthy();
    expect(screen.queryByText('Row 5')).toBeNull();
    // Pager muncul dengan rentang + navigasi.
    expect(screen.getByText(/1–5 of 12/)).toBeTruthy();
    expect(screen.getByText('Previous')).toBeTruthy();
  });

  it('moves to the next page when Next is clicked (client pagination)', () => {
    const many: Row[] = Array.from({ length: 12 }).map((_, i) => ({ id: `r${i}`, name: `Row ${i}` }));
    render(<DataGrid columns={columns} data={many} clientPagination pageSize={5} />);
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Row 5')).toBeTruthy();
    expect(screen.queryByText('Row 0')).toBeNull();
  });

  it('uses auto layout by default (table-fixed only when opted in)', () => {
    const { container: auto } = render(<DataGrid columns={columns} data={rows} />);
    expect(auto.querySelector('table')!.className).not.toContain('table-fixed');

    const { container: fixed } = render(<DataGrid columns={columns} data={rows} tableLayout="fixed" />);
    expect(fixed.querySelector('table')!.className).toContain('table-fixed');
  });

  it('applies width (not minWidth) and nowrap in fixed layout', () => {
    const sized = [columnHelper.accessor('name', { header: 'Nama', size: 180, meta: { nowrap: true }, cell: (i) => i.getValue() })];
    const { container } = render(<DataGrid columns={sized} data={rows} tableLayout="fixed" />);
    const th = screen.getByText('Nama').closest('th')!;
    expect(th.style.width).toBe('180px');
    expect(th.style.minWidth).toBe('');
    const td = container.querySelector('tbody td')!;
    expect(td.className).toContain('whitespace-nowrap');
  });
});
