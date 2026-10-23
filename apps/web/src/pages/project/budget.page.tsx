import { useState } from 'react';
import { EntitySelect, ErrorState } from '@aec/ui';
import { useBudget, useUpsertBudget } from '@/features/project';
import { useProjects } from '@/entities/project';
import {
  BaselineActions,
  BaselineHistory,
  BudgetStatement,
  CostComposition,
  DocumentBand,
  EmptyBudgetPanel,
  ExceptionStrip,
  MoneyPosition,
} from '@/features/project/ui';
import { formatIdrCompact } from '@/shared/lib/format';
import { PAGE_SIZE_LARGE as PAGE_SIZE } from '@/shared/lib/pagination';

/**
 * Budget Baseline — dokumen biaya satu proyek.
 *
 * Halaman ini punya TIGA keadaan, bukan satu layout yang dipaksakan:
 *
 *   A. belum ada alokasi   -> satu panel tenang, zona lain tidak dirender
 *   B. ada alokasi, belum  -> posisi uang + tabel, Freeze jadi aksi utama
 *      ada baseline
 *   C. ada baseline        -> dokumen penuh: posisi, pernyataan, komposisi,
 *                             riwayat, tindakan
 *
 * Memaksakan lima zona pada keadaan A menghasilkan empat kotak kosong dan daftar
 * "simpul tanpa budget" — memberitahu hal yang sama lima kali.
 */
export function BudgetPage() {
  const [projectId, setProjectId] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useBudget(projectId);
  const upsert = useUpsertBudget(projectId);
  const projects = useProjects({ page: 1, pageSize: PAGE_SIZE });

  const selectedProject = (projects.data?.items ?? []).find((p) => p.id === projectId);
  const hasOpenRevision = data?.openRevision ?? false;
  const previous = data ? (data.versions.find((v) => v.id !== data.baseline?.id) ?? null) : null;

  const hasAllocation = (data?.totals.revised ?? 0) > 0;
  const hasBaseline = data?.baseline != null;

  const statusLine = !data
    ? ''
    : !hasAllocation
      ? 'No budget allocated'
      : hasBaseline
        ? `${formatIdrCompact(data.totals.revised)} revised`
        : `${formatIdrCompact(data.totals.revised)} allocated · no baseline frozen`;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Pemilih proyek adalah kontrol dokumen, bukan kotak berlabel yang
          menggantung di kanan judul. Identitas proyek ada di band di bawahnya. */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-3">
        <div className="min-w-0 flex-1">
          <EntitySelect
            value={projectId}
            onValueChange={(v) => {
              setProjectId(v);
              setSelectedId(null);
            }}
            options={(projects.data?.items ?? []).map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` }))}
            placeholder="Select a project…"
            searchPlaceholder="Search project…"
            className="h-8 w-full max-w-[26rem] text-body-sm"
            variant="editorial"
          />
        </div>
        <p className="text-caption uppercase text-neutral-500">Budget baseline</p>
      </div>

      {!projectId && (
        <p className="py-12 text-body-sm text-neutral-500">Select a project to see its cost position.</p>
      )}

      {isLoading && (
        <div aria-busy="true" className="space-y-6">
          <div className="h-16 animate-pulse bg-neutral-100" />
          <div className="h-56 animate-pulse bg-neutral-100" />
        </div>
      )}

      {isError && <ErrorState message="Failed to load the budget statement." onRetry={() => refetch()} />}

      {data && projectId && (
        <>
          <DocumentBand
            projectCode={selectedProject?.code ?? data.projectId}
            projectName={selectedProject?.name ?? 'Project'}
            statusLine={statusLine}
            baseline={data.baseline}
            previous={previous}
            hasOpenRevision={hasOpenRevision}
            actions={
              <BaselineActions
                projectId={projectId}
                baseline={data.baseline}
                hasOpenRevision={hasOpenRevision}
                canFreeze={hasAllocation}
              />
            }
          />

          {/* Keadaan A — belum ada alokasi. Zona lain sengaja tidak dirender. */}
          {!hasAllocation && (
            <EmptyBudgetPanel actual={data.totals.actual} nodeCount={data.costCoverage.totalNodes} />
          )}

          {/* Keadaan B dan C — ada alokasi. */}
          {hasAllocation && (
            <>
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
                  {data.costCoverage.allocatedNodes} of {data.costCoverage.totalNodes} nodes carry actual cost — cost is
                  only recorded against the WBS that received it, so others show 0 by design.
                </p>
              </section>

              {/* Komposisi hanya bermakna bila ada cost type yang terisi. */}
              {data.composition.length > 0 && (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                  <div className="xl:col-span-7">
                    <CostComposition composition={data.composition} />
                  </div>
                  <div className="xl:col-span-5">
                    <BaselineHistory versions={data.versions} />
                  </div>
                </div>
              )}

              <ExceptionStrip warnings={data.warnings} reconciliation={data.reconciliation} />
            </>
          )}

          {upsert.isError && (
            <p role="alert" className="text-body-sm text-destructive-700">
              Failed to save the budget.{hasOpenRevision ? '' : ' No revision is open.'}
            </p>
          )}
        </>
      )}
    </div>
  );
}
