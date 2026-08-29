import { useState } from 'react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
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
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="ncr-cat">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WORKMANSHIP">WORKMANSHIP</SelectItem>
              <SelectItem value="MATERIAL">MATERIAL</SelectItem>
              <SelectItem value="DESIGN">DESIGN</SelectItem>
              <SelectItem value="DOCUMENT">DOCUMENT</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="ncr-sev">Severity</Label>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger id="ncr-sev">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MINOR">MINOR</SelectItem>
              <SelectItem value="MAJOR">MAJOR</SelectItem>
              <SelectItem value="CRITICAL">CRITICAL</SelectItem>
            </SelectContent>
          </Select>
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
