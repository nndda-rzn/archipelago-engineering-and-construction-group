import { useState } from 'react';
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
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
      <Select value={projectId} onValueChange={setProjectId}>
        <SelectTrigger id="qp-project">
          <SelectValue placeholder="Pilih project…" />
        </SelectTrigger>
        <SelectContent>
          {(projects.data?.items ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

export function WpSelect({ id, projectId, value, onChange, workPackages }: { id: string; projectId: string; value: string; onChange: (v: string) => void; workPackages?: { items: { id: string; wpNumber: string; title?: string }[] } }) {
  return (
    <div>
      <Label htmlFor={id}>Work Package</Label>
      <Select value={value} onValueChange={onChange} disabled={!projectId}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Tanpa WP" />
        </SelectTrigger>
        <SelectContent>
          {(workPackages?.items ?? []).map((w) => <SelectItem key={w.id} value={w.id}>{w.wpNumber}{w.title ? ` — ${w.title}` : ''}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
