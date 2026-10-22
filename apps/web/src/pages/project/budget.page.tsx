import { useState } from 'react';
import { Button, EntitySelect } from '@aec/ui';
import { useBudget, useUpsertBudget } from '@/features/project';
import { useProjects } from '@/entities/project';
import { BaselineHeader, BudgetStatement, BudgetWarnings } from '@/features/project/ui';
import { PAGE_SIZE_LARGE as PAGE_SIZE } from '@/shared/lib/pagination';

/**
 * Budget Baseline — pernyataan biaya satu proyek.
 *
 * Halaman ini sengaja tidak memakai kartu KPI: angka yang ditampilkan (baseline,
 * revisi, komitmen, aktual, sisa, selisih) harus dibaca berderet per baris WBS,
 * dan memecahnya ke kartu akan menghilangkan hubungan antar-kolom yang justru
 * menjadi inti halaman.
 */
export function BudgetPage() {
  const [projectId, setProjectId] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useBudget(projectId);
  const upsert = useUpsertBudget(projectId);
  const projects = useProjects({ page: 1, pageSize: PAGE_SIZE });

  const selectedProject = (projects.data?.items ?? []).find((p) => p.id === projectId);
  /** Status revisi datang dari API, bukan ditebak dari bentuk data. */
  const hasOpenRevision = data?.openRevision ?? false;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 text-neutral-950">Budget Baseline</h1>
          <p className="mt-1 text-body-sm text-neutral-500">
            Baseline, revision, commitment and actual cost per WBS.
          </p>
        </div>
        <div className="w-72">
          <label htmlFor="project-budget" className="mb-1.5 block text-body-sm font-medium text-neutral-700">
            Project
          </label>
          <EntitySelect
            value={projectId}
            onValueChange={(v) => {
              setProjectId(v);
              setSelectedId(null);
            }}
            options={(projects.data?.items ?? []).map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` }))}
            placeholder="Select project…"
            searchPlaceholder="Search project…"
          />
        </div>
      </div>

      {isLoading && <p className="text-body-sm text-neutral-500">Loading…</p>}

      {isError && (
        <div role="alert" className="border border-destructive-200 bg-destructive-50 px-3 py-2">
          <p className="text-body-sm text-destructive-700">
            Failed to load the budget statement.{' '}
            <Button variant="secondary" size="sm" onClick={() => refetch()}>Retry</Button>
          </p>
        </div>
      )}

      {data && projectId && (
        <>
          <BaselineHeader projectId={projectId} baseline={data.baseline} previous={data.previous} hasOpenRevision={hasOpenRevision} />

          <BudgetWarnings warnings={data.warnings} reconciliation={data.reconciliation} />

          <BudgetStatement
            statement={data}
            selectedId={selectedId}
            onSelect={setSelectedId}
            published={!hasOpenRevision}
            saving={upsert.isPending}
            onSave={(costType, amount) => {
              if (!selectedId) return;
              upsert.mutate({ wbsItemId: selectedId, costType, amount });
            }}
          />

          <p className="text-caption text-neutral-600">
            {data.costCoverage.allocatedNodes} of {data.costCoverage.totalNodes} nodes carry actual cost — cost is only
            recorded against the WBS that received it, so others show 0 by design.
          </p>
        </>
      )}

      {upsert.isError && (
        <p className="text-body-sm text-destructive-700">
          Failed to save the budget.{hasOpenRevision ? '' : ' No revision is open.'}
        </p>
      )}

      {selectedProject && !data && !isLoading && !isError && (
        <p className="text-body-sm text-neutral-500">No budget for {selectedProject.code}.</p>
      )}
    </div>
  );
}
