import { useState } from 'react';
import { Button, Input, Label } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useCreateSubcontract, useCreateSubcontractProgress } from '../model/subcontract.api';
import type { Subcontract } from '@aec/api-contracts';

export function SubconForm({ onDone }: { onDone: () => void }) {
  const [projectId, setProjectId] = useState('');
  const [vendor, setVendor] = useState('');
  const [title, setTitle] = useState('');
  const [contractValue, setContractValue] = useState(0);
  const projects = useProjects({ page: 1, pageSize: 100 });
  const create = useCreateSubcontract();

  const onSubmit = () => {
    if (!projectId || !vendor || !title || contractValue <= 0) return;
    create.mutate(
      { projectId, vendor, title, contractValue },
      { onSuccess: () => { setVendor(''); setTitle(''); setContractValue(0); onDone(); } },
    );
  };

  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="sc-project">Project</Label>
          <select id="sc-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Pilih project...</option>
            {(projects.data?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
          </select>
        </div>
        <div><Label htmlFor="sc-vendor">Vendor Subkon</Label><Input id="sc-vendor" placeholder="PT. Subkon Sejahtera" value={vendor} onChange={(e) => setVendor(e.target.value)} /></div>
        <div><Label htmlFor="sc-title">Judul Pekerjaan</Label><Input id="sc-title" placeholder="mis. Struktur baja area B" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div><Label htmlFor="sc-value">Nilai Kontrak</Label><Input id="sc-value" type="number" min={0} step={100000} value={contractValue || ''} onChange={(e) => setContractValue(Number(e.target.value))} /></div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="button" onClick={onSubmit} loading={create.isPending}>Buat Subcontract</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal membuat subcontract.</p>}
    </div>
  );
}

export function ProgressForm({ subcontract }: { subcontract: Subcontract }) {
  const [progressPercent, setProgressPercent] = useState('');
  const [period, setPeriod] = useState('');
  const create = useCreateSubcontractProgress();

  const onSubmit = () => {
    if (!progressPercent) return;
    create.mutate(
      { subcontractId: subcontract.id, progressPercent: Number(progressPercent), period: period || undefined },
      { onSuccess: () => { setProgressPercent(''); setPeriod(''); } },
    );
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div><Label htmlFor="scp-period">Periode</Label><Input id="scp-period" placeholder="mis. 2026-09" value={period} onChange={(e) => setPeriod(e.target.value)} /></div>
      <div><Label htmlFor="scp-progress">Progress Fisik (%)</Label><Input id="scp-progress" type="number" min={0} max={100} placeholder="mis. 35" value={progressPercent} onChange={(e) => setProgressPercent(e.target.value)} /></div>
      <Button onClick={onSubmit} loading={create.isPending}>Kirim Progress</Button>
      {create.isError && <p className="text-caption text-destructive-600">Gagal kirim progress.</p>}
    </div>
  );
}
