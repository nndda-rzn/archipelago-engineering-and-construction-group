import { useState } from 'react';
import { Button, Input, Label } from '@aec/ui';
import { useCreateItp } from '../model/quality.api';
import { ProjectSelect, WpSelect, useProjectOptions } from './quality-selects';

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
