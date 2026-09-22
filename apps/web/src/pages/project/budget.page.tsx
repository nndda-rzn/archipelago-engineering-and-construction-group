import { useState } from 'react';
import { Button, EntitySelect } from '@aec/ui';
import { useBudget, usePublishBudget, useUpsertBudget } from '@/features/project';
import { useProjects } from '@/entities/project';
import { BudgetRow, BudgetStatusBadge, BudgetTotalBar } from '@/features/project/ui';
import { PAGE_SIZE_LARGE as PAGE_SIZE } from '@/shared/lib/pagination';

export function BudgetPage() {
  const [projectId, setProjectId] = useState('');
  const { data, isLoading, isError, refetch } = useBudget(projectId);
  const upsert = useUpsertBudget(projectId);
  const publish = usePublishBudget(projectId);
  const projects = useProjects({ page: 1, pageSize: PAGE_SIZE });

  const selectedProject = (projects.data?.items ?? []).find((p) => p.id === projectId);
  const published = data?.status === 'PUBLISHED';

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Budget Baseline</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Anggaran per WBS (FR-PRJ-005/006)</p>
        </div>
        {data && <BudgetStatusBadge published={published} publishPending={publish.isPending} onPublish={() => publish.mutate()} />}
      </div>

      <div className="mb-4 w-72">
        <label htmlFor="project-budget" className="mb-1.5 block text-body-sm font-medium text-neutral-700">
          Project
        </label>
        <EntitySelect
          value={projectId}
          onValueChange={setProjectId}
          options={(projects.data?.items ?? []).map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
          placeholder="Pilih project…"
          searchPlaceholder="Cari project…"
        />
      </div>

      {isLoading && <p className="text-body-sm text-neutral-500">Memuat…</p>}
      {isError && (
        <p className="text-body-sm text-destructive-600">
          Gagal memuat budget.{' '}
          <Button variant="secondary" size="sm" onClick={() => refetch()}>Coba lagi</Button>
        </p>
      )}

      {data && projectId && (
        <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
          <BudgetTotalBar total={data.totalBudget} currency={selectedProject?.currency ?? 'IDR'} />
          {data.wbs.length === 0 ? (
            <p className="p-6 text-center text-body-sm text-neutral-500">Belum ada WBS. Tambah di halaman WBS dulu.</p>
          ) : (
            data.wbs.map((w) => (
              <BudgetRow
                key={w.id}
                code={w.code}
                name={w.name}
                amount={w.budget}
                depth={w.parentId ? 1 : 0}
                saving={upsert.isPending}
                onSave={(amount) => upsert.mutate({ wbsItemId: w.id, amount })}
              />
            ))
          )}
        </div>
      )}

      {upsert.isError && (
        <p className="mt-3 text-body-sm text-destructive-600">Gagal menyimpan budget.{published ? ' Budget sudah publish.' : ''}</p>
      )}
      {publish.isError && <p className="mt-3 text-body-sm text-destructive-600">Gagal publish. Periksa data budget.</p>}
    </div>
  );
}
