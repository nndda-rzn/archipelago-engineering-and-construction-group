import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
  type SortingState,
  type PaginationState,
} from '@tanstack/react-table';
import { ChevronDown, ChevronUp, ChevronsUpDown, Download } from 'lucide-react';
import { Button } from '../primitives/button';
import { TableSkeleton } from '../primitives/skeleton';
import { ErrorState } from './state';

export interface DataGridProps<TData> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack ColumnDef memakai any untuk value generic.
  columns: ColumnDef<TData, any>[];
  data: TData[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  emptyMessage?: string;

  rowCount?: number;
  pagination?: PaginationState;
  onPaginationChange?: (pagination: PaginationState) => void;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;

  onRowClick?: (row: Row<TData>) => void;
  /** Baris yang sedang aktif/terpilih (highlight). Butuh `getRowId` agar cocok. */
  selectedRowId?: string;
  /** Id unik per baris agar `selectedRowId` dapat dicocokkan; default index TanStack. */
  getRowId?: (originalRow: TData, index: number) => string;

  exportFilename?: string;

  density?: 'compact' | 'comfortable';

  hideToolbar?: boolean;
}

function escapeCsv(value: unknown): string {
  const s = value == null ? '' : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.join(',')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function DataGrid<TData>({
  columns,
  data,
  isLoading,
  isError,
  onRetry,
  emptyMessage = 'No data',
  rowCount,
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
  onRowClick,
  selectedRowId,
  getRowId,
  exportFilename,
  density = 'compact',
  hideToolbar,
}: DataGridProps<TData>) {
  const isServer = pagination !== undefined && onPaginationChange !== undefined;

  const [internalPagination, setInternalPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const effectivePagination = pagination ?? internalPagination;

  const table = useReactTable({
    data,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: sorting !== undefined ? getSortedRowModel() : undefined,
    manualPagination: isServer,
    manualSorting: sorting !== undefined && onSortingChange !== undefined,
    rowCount: rowCount ?? data.length,
    state: {
      pagination: effectivePagination,
      sorting,
    },
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater(effectivePagination) : updater;
      handlePaginationChange(next);
    },
    onSortingChange: onSortingChange ? (updater) => {
      const next = typeof updater === 'function' ? updater(table.getState().sorting) : updater;
      onSortingChange(next);
    } : undefined,
  });

  const handlePaginationChange = onPaginationChange ?? setInternalPagination;

  const exportCsv = () => {
    if (!exportFilename || data.length === 0) return;
    const visibleCols = table.getVisibleFlatColumns().filter((c) => c.id !== 'actions' && c.id !== 'select');
    const header = visibleCols.map((c) => escapeCsv(typeof c.columnDef.header === 'string' ? c.columnDef.header : c.id));
    const rows = data.map((item) =>
      visibleCols.map((c) => {
        const value = (item as Record<string, unknown>)[c.id];
        if (value && typeof value === 'object') return escapeCsv(JSON.stringify(value));
        return escapeCsv(value);
      }),
    );
    downloadCsv(exportFilename, [header, ...rows]);
  };

  if (isLoading) {
    return <TableSkeleton rows={5} cols={columns.length} />;
  }

  if (isError) {
    return <ErrorState onRetry={onRetry} />;
  }

  const pageCount = table.getPageCount();
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;

  return (
    <div>
      {!hideToolbar && (
        <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
          <span className="text-caption text-neutral-500">
            {rowCount != null
              ? `${data.length} of ${rowCount.toLocaleString('id-ID')} total`
              : `${data.length} rows`}
          </span>
          {exportFilename && (
            <Button size="sm" variant="secondary" onClick={exportCsv} disabled={data.length === 0}>
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Export CSV
            </Button>
          )}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-body-sm">
          <thead className="sticky top-0 z-sticky bg-neutral-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-neutral-200 bg-neutral-50">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sortDir = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className="px-2 py-2 text-caption font-medium uppercase text-neutral-500"
                      style={{ width: header.getSize() }}
                      aria-sort={
                        sortDir === 'asc' ? 'ascending'
                        : sortDir === 'desc' ? 'descending'
                        : canSort ? 'none'
                        : undefined
                      }
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 uppercase hover:text-neutral-700"
                          onClick={header.column.getToggleSortingHandler()}
                          aria-label={`Sort by ${typeof header.column.columnDef.header === 'string' ? header.column.columnDef.header : header.id}`}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sortDir === 'asc' ? (
                            <ChevronUp className="h-3 w-3" aria-hidden="true" />
                          ) : sortDir === 'desc' ? (
                            <ChevronDown className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <ChevronsUpDown className="h-3 w-3 opacity-40" aria-hidden="true" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-body-sm text-neutral-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => {
                const isSelected = selectedRowId !== undefined && row.id === selectedRowId;
                return (
                  <tr
                    key={row.id}
                    aria-selected={selectedRowId !== undefined ? isSelected : undefined}
                    className={`border-b border-neutral-100 last:border-0 ${isSelected ? 'bg-racing-red-50' : 'hover:bg-neutral-50'} ${onRowClick ? 'cursor-pointer' : ''}`}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className={density === 'compact' ? 'px-2 py-1.5' : 'px-4 py-3'}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isServer && pageCount > 1 && (
        <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-2">
          <span className="text-caption text-neutral-500">
            {pageIndex * pageSize + 1}–{Math.min((pageIndex + 1) * pageSize, rowCount ?? 0)} of {rowCount?.toLocaleString('id-ID') ?? 0}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <span className="text-caption text-neutral-500">
              Page {pageIndex + 1} of {pageCount}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
