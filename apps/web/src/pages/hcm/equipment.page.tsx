import { useState } from 'react';
import { Button, DataGrid } from '@aec/ui';
import { useEquipment, type Equipment } from '@/features/hcm';
import { EquipmentForm, EquipmentDetail, equipmentColumns } from '@/features/hcm/ui';

const PAGE_SIZE = 20;

export function EquipmentPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState('');

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
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body"
          >
            <option value="">Semua Status</option>
            <option value="AVAILABLE">AVAILABLE</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="MAINTENANCE">MAINTENANCE</option>
            <option value="BREAKDOWN">BREAKDOWN</option>
          </select>
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
          onPaginationChange={setPagination}
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
