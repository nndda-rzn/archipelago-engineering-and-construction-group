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
import { cn } from '../lib/cn';
import { Button } from '../primitives/button';

export interface DataGridProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  emptyMessage?: string;
  /** Server-side pagination state (PRD §22) — kontrol dari parent via TanStack Query. */
  rowCount?: number;
  pagination?: PaginationState;
  onPaginationChange?: (pagination: PaginationState) => void;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  /** Click row handler — untuk detail drill-down. */
  onRowClick?: (row: Row<TData>) => void;
  /** Judul file saat export CSV. */
  exportFilename?: string;
  /** Mode kepadatan baris. Default compact. */
  density?: 'compact' | 'comfortable';
  /** Sembunyikan toolbar (export). */
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
  emptyMessage = 'Tidak ada data',
  rowCount,
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
  onRowClick,
  exportFilename,
  density = 'compact',
  hideToolbar,
}: DataGridProps<TData>) {
  const isServer = pagination !== undefined && onPaginationChange !== undefined;

  // Client mode: internal pagination state agar TanStack tak crash (getPageCount butuh state.pagination).
  const [internalPagination, setInternalPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const effectivePagination = pagination ?? internalPagination;

  const table = useReactTable({
    data,
    columns,
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
    return <p className="p-6 text-body-sm text-neutral-500">Memuat…</p>;
  }

  if (isError) {
    return (
      <div className="p-6 text-body-sm text-destructive-600">
        Gagal memuat data.{' '}
        {onRetry && (
          <button type="button" className="text-racing-red-600 hover:underline" onClick={onRetry}>
            Coba lagi
          </button>
        )}
      </div>
    );
  }

  const pageCount = table.getPageCount();
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;

  return (
    <div>
      {!hideToolbar && (
        <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
          <span className="text-caption text-neutral-500">{data.length} baris</span>
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
                      className="px-2 py-2 text-caption font-medium uppercase text-neutral-500"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 uppercase hover:text-neutral-700"
                          onClick={header.column.getToggleSortingHandler()}
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
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-neutral-100 last:border-0 hover:bg-neutral-50 ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className={density === 'compact' ? 'px-2 py-1.5' : 'px-4 py-3'}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isServer && pageCount > 1 && (
        <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-2">
          <span className="text-caption text-neutral-500">
            {pageIndex * pageSize + 1}–{Math.min((pageIndex + 1) * pageSize, rowCount ?? 0)} dari {rowCount ?? 0}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Sebelumnya
            </Button>
            <span className="text-caption text-neutral-500">
              Hal {pageIndex + 1} / {pageCount}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
