import { useState } from 'react';
import type { SortingState } from '@tanstack/react-table';
import { useNavigate } from '@tanstack/react-router';
import type { LegalEntityListParams } from '@aec/api-contracts';
import { ErrorState, Skeleton } from '@aec/ui';
import { useLegalEntities } from '@/entities/legal-entity';
import {
  LegalEntityForm,
  LegalEntityListToolbar,
  LegalEntityRegister,
  useLegalEntityListFilters,
  type LegalEntityWithMetrics,
} from '@/features/foundation/ui';
import { PAGE_SIZE } from '@/shared/lib/pagination';

/**
 * Daftar legal entity sebagai **register**: baris tipis (hairline) dengan
 * encoding grafis (bullet skala + stacked komposisi), bukan kartu dan bukan
 * tabel polos. Filter (search/status) hidup di URL agar dapat dibagikan.
 */
export function LegalEntityListPage() {
  const navigate = useNavigate();
  const { search, status } = useLegalEntityListFilters();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  const params: LegalEntityListParams = {
    page,
    pageSize: PAGE_SIZE,
    sortBy: (sorting[0]?.id as LegalEntityListParams['sortBy']) ?? undefined,
    sortDir: sorting[0]?.desc ? 'desc' : 'asc',
    search: search || undefined,
    status: (status as LegalEntityListParams['status']) || undefined,
  };
  const { data, isLoading, isError, refetch } = useLegalEntities(params);

  const openDetail = (entity: LegalEntityWithMetrics) => {
    navigate({ to: '/foundation/legal-entities/$entityId', params: { entityId: entity.id } as never });
  };

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      <header>
        <h1 className="text-h1 text-neutral-950">Legal Entities</h1>
        <p className="mt-1 text-body-sm text-neutral-500">
          Company legal entities · search, filter and open an entity to see where it is used
        </p>
      </header>

      <LegalEntityListToolbar onAdd={() => setShowForm((s) => !s)} />

      {showForm && <LegalEntityForm mode="create" onDone={() => setShowForm(false)} />}

      {isLoading ? (
        <div aria-label="Loading legal entities" className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div role="alert">
          <ErrorState message="The legal entities could not be loaded." onRetry={() => refetch()} />
        </div>
      ) : (data?.items.length ?? 0) === 0 ? (
        <div className="rounded-md border border-neutral-200 bg-white p-8 text-center text-body-sm text-neutral-500">
          {search || status ? 'No entities match this filter. Clear the search or status.' : 'No legal entities yet. Add the first one.'}
        </div>
      ) : (
        <LegalEntityRegister items={(data?.items ?? []) as LegalEntityWithMetrics[]} onRowClick={openDetail} sort={sorting} onSortChange={setSorting} />
      )}

      {(data?.totalPages ?? 1) > 1 && (
        <div className="flex items-center justify-between text-body-sm text-neutral-600">
          <span className="font-mono tabular-nums">
            {data?.total ?? 0} entities
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded px-2 py-1 hover:bg-neutral-100 disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="rounded px-2 py-1 hover:bg-neutral-100 disabled:opacity-40"
              disabled={page >= (data?.totalPages ?? 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
