import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataGrid } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';

interface Row {
  id: string;
  name: string;
}

const helper = createColumnHelper<Row>();
const columns = [helper.accessor('name', { header: 'Name', cell: (i) => i.getValue() })];
const data: Row[] = [
  { id: '1', name: 'Alpha' },
  { id: '2', name: 'Beta' },
];

describe('DataGrid row drill-through keyboard support', () => {
  it('makes clickable rows focusable', () => {
    render(<DataGrid columns={columns} data={data} onRowClick={vi.fn()} getRowId={(r) => r.id} />);
    const rows = screen.getAllByRole('row');
    // rows[0] adalah header; baris data mulai index 1.
    expect(rows[1]?.getAttribute('tabindex')).toBe('0');
  });

  it('invokes onRowClick when Enter is pressed on a focused row', () => {
    const onRowClick = vi.fn();
    render(<DataGrid columns={columns} data={data} onRowClick={onRowClick} getRowId={(r) => r.id} />);
    const firstDataRow = screen.getAllByRole('row')[1]!;
    fireEvent.keyDown(firstDataRow, { key: 'Enter' });
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick.mock.calls[0]?.[0].original).toMatchObject({ id: '1' });
  });

  it('invokes onRowClick when Space is pressed', () => {
    const onRowClick = vi.fn();
    render(<DataGrid columns={columns} data={data} onRowClick={onRowClick} getRowId={(r) => r.id} />);
    const firstDataRow = screen.getAllByRole('row')[1]!;
    fireEvent.keyDown(firstDataRow, { key: ' ' });
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });

  it('does not make rows focusable when there is no row click handler', () => {
    render(<DataGrid columns={columns} data={data} getRowId={(r) => r.id} />);
    const rows = screen.getAllByRole('row');
    expect(rows[1]?.getAttribute('tabindex')).toBeNull();
  });
});
