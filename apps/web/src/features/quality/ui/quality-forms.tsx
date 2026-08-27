import { useState } from 'react';
import { Button, Input, Label } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useWorkPackages } from '@/features/construction';
import { useCreateItp, useCreateInspection, useCreateNcr, useCreatePunchItem } from '../model/quality.api';

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
      <select
        id="qp-project"
        value={projectId}
        onChange={(e) => setProjectId(e.target.value)}
        className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body"
      >
        <option value="">Pilih project…</option>
        {(projects.data?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
      </select>
    </div>
  );
}

function WpSelect({ id, projectId, value, onChange, workPackages }: { id: string; projectId: string; value: string; onChange: (v: string) => void; workPackages?: { items: { id: string; wpNumber: string; title?: string }[] } }) {
  return (
    <div>
      <Label htmlFor={id}>Work Package</Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={!projectId}
        className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body disabled:bg-neutral-50"
      >
        <option value="">Tanpa WP</option>
        {(workPackages?.items ?? []).map((w) => <option key={w.id} value={w.id}>{w.wpNumber}{w.title ? ` — ${w.title}` : ''}</option>)}
      </select>
    </div>
  );
}

export function ItpForm({ onDone }: { onDone: () => void }) {
  const { projectId, setProjectId, workPackages } = useProjectOptions();
  const [title, setTitle] = useState('');
  const [wpId, setWpId] = useState('');
  const create = useCreateItp();
  const onSubmit = () => {
    if (!title) return;
    create.mutate({ workPackageId: wpId || undefined, title }, { onSuccess: () => { setTitle(''); setWpId(''); onDone(); } });
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <ProjectSelect projectId={projectId} setProjectId={setProjectId} />
        <WpSelect id="itp-wp" projectId={projectId} value={wpId} onChange={setWpId} workPackages={workPackages} />
        <div className="flex-1">
          <Label htmlFor="itp-title">Judul ITP</Label>
          <Input id="itp-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat ITP</Button>
      </div>
    </div>
  );
}

export function InspectionForm({ onDone }: { onDone: () => void }) {
  const { projectId, setProjectId, workPackages } = useProjectOptions();
  const [description, setDescription] = useState('');
  const [wpId, setWpId] = useState('');
  const create = useCreateInspection();
  const onSubmit = () => {
    if (!description) return;
    create.mutate({ workPackageId: wpId || undefined, description }, { onSuccess: () => { setDescription(''); setWpId(''); onDone(); } });
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <ProjectSelect projectId={projectId} setProjectId={setProjectId} />
        <WpSelect id="ins-wp" projectId={projectId} value={wpId} onChange={setWpId} workPackages={workPackages} />
        <div className="flex-1">
          <Label htmlFor="ins-desc">Deskripsi Inspeksi</Label>
          <Input id="ins-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat Inspeksi</Button>
      </div>
    </div>
  );
}

export function NcrForm({ onDone }: { onDone: () => void }) {
  const { projectId, setProjectId, workPackages } = useProjectOptions();
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('MINOR');
  const [category, setCategory] = useState('WORKMANSHIP');
  const [wpId, setWpId] = useState('');
  const create = useCreateNcr();
  const onSubmit = () => {
    if (!description) return;
    create.mutate(
      { category, severity, description, workPackageId: wpId || undefined },
      { onSuccess: () => { setDescription(''); onDone(); } },
    );
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <ProjectSelect projectId={projectId} setProjectId={setProjectId} />
        <WpSelect id="ncr-wp" projectId={projectId} value={wpId} onChange={setWpId} workPackages={workPackages} />
        <div>
          <Label htmlFor="ncr-cat">Kategori</Label>
          <select id="ncr-cat" value={category} onChange={(e) => setCategory(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="WORKMANSHIP">WORKMANSHIP</option>
            <option value="MATERIAL">MATERIAL</option>
            <option value="DESIGN">DESIGN</option>
            <option value="DOCUMENT">DOCUMENT</option>
          </select>
        </div>
        <div>
          <Label htmlFor="ncr-sev">Severity</Label>
          <select id="ncr-sev" value={severity} onChange={(e) => setSeverity(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="MINOR">MINOR</option>
            <option value="MAJOR">MAJOR</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>
        <div className="flex-1">
          <Label htmlFor="ncr-desc">Deskripsi NCR</Label>
          <Input id="ncr-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat NCR</Button>
      </div>
    </div>
  );
}

export function PunchForm({ onDone }: { onDone: () => void }) {
  const { projectId, setProjectId, workPackages } = useProjectOptions();
  const [description, setDescription] = useState('');
  const [wpId, setWpId] = useState('');
  const create = useCreatePunchItem();
  const onSubmit = () => {
    if (!description) return;
    create.mutate({ description, workPackageId: wpId || undefined }, { onSuccess: () => { setDescription(''); setWpId(''); onDone(); } });
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <ProjectSelect projectId={projectId} setProjectId={setProjectId} />
        <WpSelect id="punch-wp" projectId={projectId} value={wpId} onChange={setWpId} workPackages={workPackages} />
        <div className="flex-1">
          <Label htmlFor="punch-desc">Deskripsi Punch</Label>
          <Input id="punch-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat Punch</Button>
      </div>
    </div>
  );
}
