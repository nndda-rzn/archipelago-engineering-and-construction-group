import { useState } from 'react';
import { Button, Input, Label } from '@aec/ui';
import { useCreateNcr } from '../model/quality.api';
import { ProjectSelect, WpSelect, useProjectOptions } from './quality-selects';

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
