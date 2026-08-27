import { useState } from 'react';
import type { SortingState } from '@tanstack/react-table';
import type { LegalEntityListParams } from '@aec/api-contracts';
import { Button, DataGrid } from '@aec/ui';
import { useLegalEntities } from '@/entities/legal-entity';
import { LegalEntityForm, legalEntityColumns } from '@/features/foundation/ui';

const PAGE_SIZE = 20;

export function LegalEntityListPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showForm, setShowForm] = useState(false);

  const params: LegalEntityListParams = {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    sortBy: (sorting[0]?.id as LegalEntityListParams['sortBy']) ?? undefined,
    sortDir: sorting[0]?.desc ? 'desc' : 'asc',
  };
  const { data, isLoading, isError, refetch } = useLegalEntities(params);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Legal Entities</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Badan hukum perusahaan (FR-FND-001)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>{showForm ? 'Tutup' : '+ Tambah Entity'}</Button>
      </div>

      {showForm && <LegalEntityForm onDone={() => setShowForm(false)} />}

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        <DataGrid columns={legalEntityColumns} data={data?.items ?? []} rowCount={data?.total ?? 0} pagination={pagination} onPaginationChange={setPagination} sorting={sorting} onSortingChange={setSorting} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage="Belum ada legal entity" exportFilename="legal-entities" />
      </div>
    </div>
  );
}
