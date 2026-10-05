import { useState } from 'react';
import { Button, DataGrid, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useProgressClaims } from '@/features/finance';
import { ClaimForm, progressClaimColumns, claimTypeLabel } from '@/features/finance/ui';
import { PAGE_SIZE } from '@/shared/lib/pagination';
import { useUrlFilter, useUrlPagination } from '@/shared/lib/use-url-state';
const CLAIM_TYPES = ['PROGRESS', 'COST', 'TIME', 'EOT', 'CONTRACTUAL'] as const;

export function ProgressClaimPage() {
  const [showForm, setShowForm] = useState(false);
  const [claimTypeFilter, setClaimTypeFilter] = useUrlFilter('claimType');
  const { pagination, onPaginationChange } = useUrlPagination(PAGE_SIZE);
  const { data, isLoading, isError, refetch } = useProgressClaims({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize, claimType: claimTypeFilter || undefined });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Progress Claim</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Progress claim to client · types PROGRESS/COST/TIME/EOT/CONTRACTUAL (FR-CMR-007)</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={claimTypeFilter} onValueChange={setClaimTypeFilter}>
            <SelectTrigger className="w-auto" aria-label="Filter claim type"><SelectValue placeholder="All types" /></SelectTrigger>
            <SelectContent>
              {CLAIM_TYPES.map((t) => <SelectItem key={t} value={t}>{t} · {claimTypeLabel[t]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setShowForm((s) => !s)}>{showForm ? 'Close' : '+ Create Claim'}</Button>
        </div>
      </div>

      {showForm && <ClaimForm onDone={() => setShowForm(false)} />}
      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        <DataGrid
          columns={progressClaimColumns}
          data={data?.items ?? []}
          rowCount={data?.total ?? 0}
          pagination={pagination}
          onPaginationChange={onPaginationChange}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          emptyMessage="No claims yet"
          exportFilename="progress-claims"
        />
      </div>
    </div>
  );
}
