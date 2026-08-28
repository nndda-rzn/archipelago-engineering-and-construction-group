import { useState } from 'react';
import { Button, DataGrid } from '@aec/ui';
import { useVariations } from '@/features/finance';
import { VariationForm, variationColumns } from '@/features/finance/ui';
import { PAGE_SIZE } from '@/shared/lib/pagination';

export function VariationPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading, isError, refetch } = useVariations({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize, status: statusFilter || undefined });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Variation Order</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Potential change tak ubah kontrak; approved variation update contract value (FR-CMR-005/006)</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label="Filter status"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPagination({ pageIndex: 0, pageSize: PAGE_SIZE }); }}
            className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="">Semua status</option>
            <option value="POTENTIAL">POTENTIAL</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
          <Button size="sm" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Tutup' : '+ Buat Variation'}
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
          onPaginationChange={setPagination}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          emptyMessage="Belum ada variation"
        />
      </div>
    </div>
  );
}
