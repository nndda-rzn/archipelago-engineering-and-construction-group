import { useState } from 'react';
import { Button, DataGrid, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
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
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPagination({ pageIndex: 0, pageSize: PAGE_SIZE }); }}>
            <SelectTrigger className="w-auto" aria-label="Filter status"><SelectValue placeholder="Semua status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="POTENTIAL">POTENTIAL</SelectItem>
              <SelectItem value="APPROVED">APPROVED</SelectItem>
              <SelectItem value="REJECTED">REJECTED</SelectItem>
            </SelectContent>
          </Select>
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
