import { useState } from 'react';
import { EntitySelect, ErrorState } from '@aec/ui';
import { useBudget, useUpsertBudget } from '@/features/project';
import { useProjects } from '@/entities/project';
import {
  BaselineHistory,
  BudgetStatement,
  CostComposition,
  DocumentBand,
  ExceptionStrip,
  MoneyPosition,
} from '@/features/project/ui';
import { PAGE_SIZE_LARGE as PAGE_SIZE } from '@/shared/lib/pagination';

/**
 * Budget Baseline — dokumen biaya satu proyek.
 *
 * Susunan mengikuti cara dokumen biaya dibaca, bukan cara tabel disusun:
 *   1. identitas + status versi        (apa dokumen ini)
 *   2. posisi uang                     (berapa terpakai, berapa sisa, ke mana)
 *   3. pernyataan per WBS              (rinciannya)
 *   4. komposisi + riwayat             (kenapa angkanya begitu)
 *   5. yang perlu tindakan             (apa yang harus dikerjakan)
 *
 * Zona 2 sengaja di tengah: rincian baru berguna setelah pembaca tahu posisi
 * keseluruhan. Halaman yang dimulai dari tabel memaksa pembaca menyimpulkan
 * sendiri angka totalnya.
 */
export function BudgetPage() {
  const [projectId, setProjectId] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useBudget(projectId);
  const upsert = useUpsertBudget(projectId);
  const projects = useProjects({ page: 1, pageSize: PAGE_SIZE });

  const selectedProject = (projects.data?.items ?? []).find((p) => p.id === projectId);
  const hasOpenRevision = data?.openRevision ?? false;

  // Versi tepat sebelum baseline aktif, untuk drift di band dan riwayat.
  const previous = data ? (data.versions.find((v) => v.id !== data.baseline?.id) ?? null) : null;

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

      {!projectId && (
        <p className="border-y border-neutral-200 py-10 text-body-sm text-neutral-500">
          Select a project to see its cost position.
        </p>
      )}

      {isLoading && (
        <div aria-busy="true" className="space-y-6">
          <div className="h-16 animate-pulse bg-neutral-100" />
          <div className="h-56 animate-pulse bg-neutral-100" />
          <div className="h-64 animate-pulse bg-neutral-100" />
        </div>
      )}

      {isError && (
        <ErrorState message="Failed to load the budget statement." onRetry={() => refetch()} />
      )}

      {data && projectId && (
        <div className="space-y-6">
          <DocumentBand
            projectId={projectId}
            projectCode={selectedProject?.code ?? data.projectId}
            projectName={selectedProject?.name ?? 'Project'}
            baseline={data.baseline}
            previous={previous}
            hasOpenRevision={hasOpenRevision}
          />

          <MoneyPosition
            revised={data.totals.revised}
            committed={data.totals.committed}
            actual={data.totals.actual}
            eac={data.totals.eac}
            baseline={data.totals.baseline}
          />

          <section aria-label="Statement" className="space-y-2">
            <h2 className="text-h3 text-neutral-900">Statement by WBS</h2>
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
          </section>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            <div className="xl:col-span-7">
              <CostComposition composition={data.composition} />
            </div>
            <div className="xl:col-span-5">
              <BaselineHistory versions={data.versions} />
            </div>
          </div>

          <ExceptionStrip warnings={data.warnings} reconciliation={data.reconciliation} />

          {upsert.isError && (
            <p role="alert" className="text-body-sm text-destructive-700">
              Failed to save the budget.{hasOpenRevision ? '' : ' No revision is open.'}
            </p>
          )}
        </div>
      )}

      {selectedProject && !data && !isLoading && !isError && projectId && (
        <p className="text-body-sm text-neutral-500">No budget for {selectedProject.code}.</p>
      )}
    </div>
  );
}
