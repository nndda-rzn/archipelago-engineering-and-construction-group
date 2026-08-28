import { useState } from 'react';
import { Button, EntitySelect, Label } from '@aec/ui';
import { useWbsTree } from '@/entities/wbs';
import { useProjects } from '@/entities/project';
import { WbsForm, WbsTree } from '@/features/project/ui';
import { PAGE_SIZE_LARGE as PAGE_SIZE } from '@/shared/lib/pagination';

export function WbsPage() {
  const [projectId, setProjectId] = useState('');
  const [parentId, setParentId] = useState<string | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);

  const projects = useProjects({ page: 1, pageSize: PAGE_SIZE });
  const { data: tree, isLoading, isError, refetch } = useWbsTree(projectId);
  const selectedProject = (projects.data?.items ?? []).find((p) => p.id === projectId);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-h1 text-neutral-950">Work Breakdown Structure</h1>
        <p className="mt-1 text-body-sm text-neutral-500">WBS hirarkis per project (FR-PRJ-002)</p>
      </div>

      <div className="mb-4 w-72">
        <Label htmlFor="project-select">Project</Label>
        <EntitySelect
          value={projectId}
          onValueChange={(v) => { setProjectId(v); setShowForm(false); }}
          options={(projects.data?.items ?? []).map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
          placeholder="Pilih project…"
          searchPlaceholder="Cari project…"
        />
      </div>

      {showForm && projectId && <WbsForm projectId={projectId} parentId={parentId} projectCode={selectedProject?.code ?? ''} tree={tree ?? []} onDone={() => { setParentId(undefined); setShowForm(false); }} />}

      {!projectId && <p className="text-body-sm text-neutral-500">Pilih project untuk melihat WBS.</p>}
      {isLoading && <p className="text-body-sm text-neutral-500">Memuat…</p>}
      {isError && <p className="text-body-sm text-destructive-600">Gagal memuat WBS. <button type="button" className="text-racing-red-600 hover:underline" onClick={() => refetch()}>Coba lagi</button></p>}

      {tree && projectId && (
        <div>
          <div className="mb-3 flex justify-end">
            <Button size="sm" onClick={() => { setParentId(undefined); setShowForm(true); }}>+ Tambah Root</Button>
          </div>
          <WbsTree tree={tree} onAddChild={(item) => { setParentId(item.id); setShowForm(true); }} />
        </div>
      )}
    </div>
  );
}
