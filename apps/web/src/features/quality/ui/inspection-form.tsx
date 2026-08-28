import { useState } from 'react';
import { Button, Input, Label } from '@aec/ui';
import { useCreateInspection } from '../model/quality.api';
import { ProjectSelect, WpSelect, useProjectOptions } from './quality-selects';

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
