import { useState } from 'react';
import { Button, DataGrid, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useEquipment, type Equipment } from '@/features/hcm';
import { EquipmentForm, EquipmentDetail, equipmentColumns } from '@/features/hcm/ui';
import { PAGE_SIZE } from '@/shared/lib/pagination';
import { useUrlFilter, useUrlPagination } from '@/shared/lib/use-url-state';

export function EquipmentPage() {
  const [statusFilter, setStatusFilter] = useUrlFilter('status');
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const { pagination, onPaginationChange } = useUrlPagination(PAGE_SIZE);

  const { data, isLoading, isError, refetch } = useEquipment({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    status: statusFilter || undefined,
  });

  const selected = data?.items.find((e) => e.id === selectedId) as Equipment | undefined;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Equipment</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Aset alat berat, PM, breakdown, utilization (FR-HCM-005..009)</p>
        </div>
        <div className="flex items-center gap-2">
          <Select aria-label="Filter status" value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AVAILABLE">AVAILABLE</SelectItem>
              <SelectItem value="ASSIGNED">ASSIGNED</SelectItem>
              <SelectItem value="MAINTENANCE">MAINTENANCE</SelectItem>
              <SelectItem value="BREAKDOWN">BREAKDOWN</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Tutup' : '+ Buat Equipment'}
          </Button>
        </div>
      </div>

      {showForm && <EquipmentForm onDone={() => setShowForm(false)} />}

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        <DataGrid
          columns={equipmentColumns}
          data={data?.items ?? []}
          rowCount={data?.total ?? 0}
          pagination={pagination}
          onPaginationChange={onPaginationChange}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          onRowClick={(row) => setSelectedId(row.original.id)}
          emptyMessage="Belum ada equipment"
        />
      </div>

      {selected && <EquipmentDetail equipment={selected} />}
    </div>
  );
}
