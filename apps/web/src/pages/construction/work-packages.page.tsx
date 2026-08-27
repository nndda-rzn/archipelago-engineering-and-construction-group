import { useState } from 'react';
import { Button, DataGrid, EntitySelect } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useWorkPackages } from '@/features/construction';
import { CreateWorkPackageForm, WorkPackageActionsPanel, workPackageColumns } from '@/features/construction/ui';

const PAGE_SIZE = 20;

export function WorkPackagesPage() {
  const [projectId, setProjectId] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);
  const { data: projects } = useProjects({ page: 1, pageSize: 100 });
  const { data, isLoading, isError, refetch } = useWorkPackages(projectId, { page: pagination.pageIndex + 1, pageSize: pagination.pageSize });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Work Packages</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Unit kerja konstruksi — rencana vs progress fisik (FR-CON)</p>
        </div>
        <div className="flex items-center gap-2">
          <EntitySelect
            value={projectId}
            onValueChange={(v) => { setProjectId(v); setPagination({ pageIndex: 0, pageSize: PAGE_SIZE }); }}
            options={(projects?.items ?? []).map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
            placeholder="Pilih Project…"
            searchPlaceholder="Cari project…"
            className="w-64"
          />
          {projectId && <Button size="sm" onClick={() => setShowForm(true)} disabled={showForm}>+ Work Package</Button>}
        </div>
      </div>

      {showForm && projectId && <div className="mb-6"><CreateWorkPackageForm projectId={projectId} onDone={() => setShowForm(false)} /></div>}
      {!projectId && <p className="text-body-sm text-neutral-500">Pilih project untuk melihat work packages.</p>}

      {projectId && (
        <>
          <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
            <DataGrid columns={workPackageColumns} data={data?.items ?? []} rowCount={data?.total ?? 0} pagination={pagination} onPaginationChange={setPagination} isLoading={isLoading} isError={isError} onRetry={refetch} emptyMessage="Belum ada work package" />
          </div>
          {(data?.items ?? []).some((wp) => wp.status === 'IN_PROGRESS' || wp.status === 'DRAFT') && (
            <WorkPackageActionsPanel projectId={projectId} items={data?.items ?? []} />
          )}
        </>
      )}
    </div>
  );
}
