import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
  type SortingState,
  type PaginationState,
} from '@tanstack/react-table';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
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
}: DataGridProps<TData>) {
  const isServer = pagination !== undefined && onPaginationChange !== undefined;

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: isServer,
    manualSorting: sorting !== undefined && onSortingChange !== undefined,
    rowCount: rowCount ?? data.length,
    state: {
      pagination,
      sorting,
    },
    onPaginationChange: onPaginationChange ? (updater) => {
      const next = typeof updater === 'function' ? updater(table.getState().pagination) : updater;
      onPaginationChange(next);
    } : undefined,
    onSortingChange: onSortingChange ? (updater) => {
      const next = typeof updater === 'function' ? updater(table.getState().sorting) : updater;
      onSortingChange(next);
    } : undefined,
  });

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
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-body-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-neutral-200 bg-neutral-50">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sortDir = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className="px-4 py-2 text-caption font-medium uppercase text-neutral-500"
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
                    <td key={cell.id} className="px-4 py-2.5">
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
