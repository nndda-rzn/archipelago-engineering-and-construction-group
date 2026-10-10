import { useState } from 'react';
import { Button, DataGrid, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useVariations } from '@/features/finance';
import { VariationForm, variationColumns } from '@/features/finance/ui';
import { PAGE_SIZE } from '@/shared/lib/pagination';
import { useUrlFilter, useUrlPagination } from '@/shared/lib/use-url-state';

export function VariationPage() {
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useUrlFilter('status');
  const { pagination, onPaginationChange } = useUrlPagination(PAGE_SIZE);
  const { data, isLoading, isError, refetch } = useVariations({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize, status: statusFilter || undefined });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Variation Order</h1>
          <p className="mt-1 text-body-sm text-neutral-500">A potential change does not alter the contract; an approved variation updates the contract value</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-auto" aria-label="Filter status"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="POTENTIAL">POTENTIAL</SelectItem>
              <SelectItem value="APPROVED">APPROVED</SelectItem>
              <SelectItem value="REJECTED">REJECTED</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Close' : '+ Create Variation'}
          </Button>
        </div>
      </div>

      {showForm && <VariationForm onDone={() => setShowForm(false)} />}

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        <DataGrid
          columns={variationColumns}
          data={data?.items ?? []}
          rowCount={data?.total ?? 0}
          pagination={pagination}
          onPaginationChange={onPaginationChange}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          emptyMessage="No variations yet"
        />
      </div>
    </div>
  );
}
