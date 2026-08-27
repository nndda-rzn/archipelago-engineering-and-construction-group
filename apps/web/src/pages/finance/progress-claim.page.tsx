import { useState } from 'react';
import { Button, DataGrid } from '@aec/ui';
import { useProgressClaims } from '@/features/finance';
import { ClaimForm, progressClaimColumns, claimTypeLabel } from '@/features/finance/ui';

const PAGE_SIZE = 20;
const CLAIM_TYPES = ['PROGRESS', 'COST', 'TIME', 'EOT', 'CONTRACTUAL'] as const;

export function ProgressClaimPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);
  const [claimTypeFilter, setClaimTypeFilter] = useState('');
  const { data, isLoading, isError, refetch } = useProgressClaims({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize, claimType: claimTypeFilter || undefined });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Progress Claim</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Klaim progres pekerjaan ke klien — tipe PROGRESS/COST/TIME/EOT/KONTRACTUAL (FR-CMR-007)</p>
        </div>
        <div className="flex items-center gap-2">
          <select aria-label="Filter tipe klaim" value={claimTypeFilter} onChange={(e) => { setClaimTypeFilter(e.target.value); setPagination({ pageIndex: 0, pageSize: PAGE_SIZE }); }} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Semua tipe</option>
            {CLAIM_TYPES.map((t) => <option key={t} value={t}>{t} — {claimTypeLabel[t]}</option>)}
          </select>
          <Button size="sm" onClick={() => setShowForm((s) => !s)}>{showForm ? 'Tutup' : '+ Buat Klaim'}</Button>
        </div>
      </div>

      {showForm && <ClaimForm onDone={() => setShowForm(false)} />}
      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        <DataGrid
          columns={progressClaimColumns}
          data={data?.items ?? []}
          rowCount={data?.total ?? 0}
          pagination={pagination}
          onPaginationChange={setPagination}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          emptyMessage="Belum ada claim"
          exportFilename="progress-claims"
        />
      </div>
    </div>
  );
}
