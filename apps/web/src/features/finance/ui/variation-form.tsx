import { useState } from 'react';
import { Button, Input, Label } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useCreateVariation } from '../model/variation.api';

export function VariationForm({ onDone }: { onDone: () => void }) {
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('ADDITIVE');
  const [amountChange, setAmountChange] = useState(0);
  const [scheduleImpactDays, setScheduleImpactDays] = useState('');
  const [description, setDescription] = useState('');
  const projects = useProjects({ page: 1, pageSize: 100 });
  const create = useCreateVariation();

  const onSubmit = () => {
    if (!projectId || !title || amountChange <= 0) return;
    create.mutate(
      {
        projectId,
        title,
        type,
        amountChange,
        scheduleImpactDays: scheduleImpactDays ? Number(scheduleImpactDays) : undefined,
        description: description || undefined,
      },
      { onSuccess: () => { setTitle(''); setType('ADDITIVE'); setAmountChange(0); setScheduleImpactDays(''); setDescription(''); onDone(); } },
    );
  };

  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="vr-project">Project</Label>
          <select
            id="vr-project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="">Pilih project…</option>
            {(projects.data?.items ?? []).map((project) => <option key={project.id} value={project.id}>{project.code}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="vr-title">Judul Variation</Label>
          <Input id="vr-title" placeholder="mis. Tambahan scope area X" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="vr-type">Tipe</Label>
          <select
            id="vr-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="ADDITIVE">ADDITIVE — menambah kontrak</option>
            <option value="DEDUCTIVE">DEDUCTIVE — mengurangi kontrak</option>
          </select>
        </div>
        <div>
          <Label htmlFor="vr-amount">Perubahan Nilai</Label>
          <Input id="vr-amount" type="number" min={0} step={100000} value={amountChange || ''} onChange={(e) => setAmountChange(Number(e.target.value))} />
        </div>
        <div>
          <Label htmlFor="vr-days">Dampak Jadwal (hari)</Label>
          <Input id="vr-days" type="number" min={-3650} max={3650} placeholder="Opsional" value={scheduleImpactDays} onChange={(e) => setScheduleImpactDays(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="vr-desc">Deskripsi</Label>
          <Input id="vr-desc" placeholder="Alasan variation…" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="button" onClick={onSubmit} loading={create.isPending}>Buat Variation POTENTIAL</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal membuat variation.</p>}
    </div>
  );
}
