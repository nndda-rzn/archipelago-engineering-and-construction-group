import { useState } from 'react';
import { Button, EntitySelect } from '@aec/ui';
import { useBudget, usePublishBudget, useUpsertBudget } from '@/features/project';
import { useProjects } from '@/entities/project';
import { BudgetInspector, BudgetStatusBadge, BudgetTree, BudgetWarnings } from '@/features/project/ui';
import { formatIdr } from '@/shared/lib/format';
import { PAGE_SIZE_LARGE as PAGE_SIZE } from '@/shared/lib/pagination';

export function BudgetPage() {
  const [projectId, setProjectId] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useBudget(projectId);
  const upsert = useUpsertBudget(projectId);
  const publish = usePublishBudget(projectId);
  const projects = useProjects({ page: 1, pageSize: PAGE_SIZE });

  const selectedProject = (projects.data?.items ?? []).find((p) => p.id === projectId);
  const published = data?.status === 'PUBLISHED';
  const selectedNode = data?.wbs.find((w) => w.id === selectedId) ?? null;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 text-neutral-950">Budget Baseline</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Allocation per WBS, with cost-type composition and spend.</p>
        </div>
        {data && <BudgetStatusBadge published={published} publishPending={publish.isPending} onPublish={() => publish.mutate()} />}
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

      {isLoading && <p className="text-body-sm text-neutral-500">Loading…</p>}
      {isError && (
        <p className="text-body-sm text-destructive-600">
          Failed to load budget.{' '}
          <Button variant="secondary" size="sm" onClick={() => refetch()}>Retry</Button>
        </p>
      )}

      {data && projectId && (
        <>
          <BudgetWarnings warnings={data.warnings} />

          {/* Ringkasan: angka uang penuh, mono, rata kanan — dibaca seperti ledger. */}
          <section aria-label="Budget totals" className="grid grid-cols-2 gap-x-8 gap-y-3 border-y border-neutral-200 py-3 sm:grid-cols-4">
            <div>
              <p className="text-overline uppercase text-neutral-500">Budget</p>
              <p className="mt-0.5 font-mono text-metric-sm tabular-nums text-neutral-950">{formatIdr(data.totals.budget)}</p>
            </div>
            <div>
              <p className="text-overline uppercase text-neutral-500">Used</p>
              <p className="mt-0.5 font-mono text-metric-sm tabular-nums text-neutral-950">{formatIdr(data.totals.used)}</p>
            </div>
            <div>
              <p className="text-overline uppercase text-neutral-500">Remaining</p>
              <p className={`mt-0.5 font-mono text-metric-sm tabular-nums ${data.totals.remaining < 0 ? 'text-destructive-600' : 'text-neutral-950'}`}>
                {formatIdr(data.totals.remaining)}
              </p>
            </div>
            <div>
              <p className="text-overline uppercase text-neutral-500">Contract</p>
              <p className="mt-0.5 font-mono text-metric-sm tabular-nums text-neutral-700">{formatIdr(data.totals.contractValue)}</p>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="min-w-0">
              <div className="rounded-md border border-neutral-200 bg-surface-raised shadow-xs">
                <BudgetTree nodes={data.wbs} selectedId={selectedId} onSelect={setSelectedId} />
              </div>
              <p className="mt-2 text-caption text-neutral-500">
                {data.costCoverage.allocatedNodes} of {data.costCoverage.totalNodes} nodes have allocated spend — cost is
                only recorded against material WBS, so other nodes show 0 by design.
              </p>
            </div>

            <BudgetInspector
              // `key` me-reset state form saat simpul berganti, tanpa effect.
              key={selectedNode?.id ?? 'none'}
              node={selectedNode}
              published={published}
              saving={upsert.isPending}
              onSave={(costType, amount) => {
                if (!selectedNode) return;
                upsert.mutate({ wbsItemId: selectedNode.id, costType, amount });
              }}
            />
          </div>
        </>
      )}

      {upsert.isError && (
        <p className="mt-3 text-body-sm text-destructive-600">Failed to save the budget.{published ? ' The budget is already published.' : ''}</p>
      )}
      {publish.isError && <p className="mt-3 text-body-sm text-destructive-600">Failed to publish. Check the budget data.</p>}
      {selectedProject && !data && <p className="text-body-sm text-neutral-500">No budget for {selectedProject.code}.</p>}
    </div>
  );
}
