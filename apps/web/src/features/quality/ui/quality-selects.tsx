import { useState } from 'react';
import { Label } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useWorkPackages } from '@/features/construction';

export function useProjectOptions() {
  const [projectId, setProjectId] = useState('');
  const projects = useProjects({ page: 1, pageSize: 100 });
  const { data: workPackages } = useWorkPackages(projectId, { page: 1, pageSize: 100 });
  return { projectId, setProjectId, projects, workPackages };
}

export function ProjectSelect({ projectId, setProjectId }: { projectId: string; setProjectId: (v: string) => void }) {
  const projects = useProjects({ page: 1, pageSize: 100 });
  return (
    <div>
      <Label htmlFor="qp-project">Project</Label>
      <select id="qp-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
        <option value="">Pilih project…</option>
        {(projects.data?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
      </select>
    </div>
  );
}

export function WpSelect({ id, projectId, value, onChange, workPackages }: { id: string; projectId: string; value: string; onChange: (v: string) => void; workPackages?: { items: { id: string; wpNumber: string; title?: string }[] } }) {
  return (
    <div>
      <Label htmlFor={id}>Work Package</Label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={!projectId} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body disabled:bg-neutral-50">
        <option value="">Tanpa WP</option>
        {(workPackages?.items ?? []).map((w) => <option key={w.id} value={w.id}>{w.wpNumber}{w.title ? ` — ${w.title}` : ''}</option>)}
      </select>
    </div>
  );
}
