import { useState } from 'react';
import { Button, EntitySelect } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useCommissioningTree } from '@/features/construction';
import { CommissioningForm, CommissioningTree } from '@/features/construction/ui';

export function CommissioningPage() {
  const [projectId, setProjectId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const { data: projects } = useProjects({ page: 1, pageSize: 100 });
  const { data: tree, isLoading, isError, refetch } = useCommissioningTree(projectId);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Commissioning</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Hierarki Plant → System → Subsystem → Equipment (FR-CON-005)</p>
        </div>
        <div className="flex items-center gap-2">
          <EntitySelect
            value={projectId}
            onValueChange={(v) => { setProjectId(v); setShowForm(false); }}
            options={(projects?.items ?? []).map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
            placeholder="Pilih Project…"
            searchPlaceholder="Cari project…"
            className="w-64"
          />
          {projectId && <Button size="sm" onClick={() => setShowForm(true)} disabled={showForm}>+ Node</Button>}
        </div>
      </div>

      {showForm && projectId && <CommissioningForm projectId={projectId} tree={tree ?? []} onDone={() => setShowForm(false)} />}
      {!projectId && <p className="text-body-sm text-neutral-500">Pilih project untuk melihat commissioning tree.</p>}
      {projectId && isLoading && <p className="text-body-sm text-neutral-500">Memuat…</p>}
      {projectId && isError && <div className="flex items-center gap-2"><p className="text-body-sm text-destructive-600">Gagal memuat.</p><Button size="sm" variant="secondary" onClick={() => { void refetch(); }}>Retry</Button></div>}
      {projectId && tree && <CommissioningTree tree={tree} projectId={projectId} />}
    </div>
  );
}
