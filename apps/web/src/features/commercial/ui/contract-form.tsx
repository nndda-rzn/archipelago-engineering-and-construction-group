import { useState } from 'react';
import { Button, Input, Label } from '@aec/ui';
import { useClients, useCreateContract } from '../model/commercial.api';
import { useProjects } from '@/entities/project';

export function ContractForm({ onDone }: { onDone: () => void }) {
  const { data: clients } = useClients({ page: 1, pageSize: 100 });
  const { data: projects } = useProjects({ page: 1, pageSize: 100 });
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [contractType, setContractType] = useState('LUMP_SUM');
  const [retentionTerm, setRetentionTerm] = useState('5');
  const create = useCreateContract();
  const onSubmit = () => {
    if (!clientId || !title || !value) return;
    create.mutate(
      {
        clientId,
        projectId: projectId || undefined,
        title,
        value: Number(value),
        contractType,
        retentionTerm: Number(retentionTerm),
      },
      { onSuccess: () => { setTitle(''); setValue(''); onDone(); } },
    );
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="ctr-client">Client</Label>
          <select id="ctr-client" value={clientId} onChange={(e) => setClientId(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Pilih…</option>
            {(clients?.items ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="ctr-project">Project (opsional)</Label>
          <select id="ctr-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Tanpa</option>
            {(projects?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <Label htmlFor="ctr-title">Judul Kontrak</Label>
          <Input id="ctr-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ctr-type">Tipe</Label>
          <select id="ctr-type" value={contractType} onChange={(e) => setContractType(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="LUMP_SUM">LUMP_SUM</option>
            <option value="UNIT_PRICE">UNIT_PRICE</option>
            <option value="COST_PLUS">COST_PLUS</option>
            <option value="TIME_MATERIAL">TIME_MATERIAL</option>
          </select>
        </div>
        <div>
          <Label htmlFor="ctr-value">Nilai</Label>
          <Input id="ctr-value" type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ctr-ret">Retensi %</Label>
          <Input id="ctr-ret" type="number" min={0} max={100} value={retentionTerm} onChange={(e) => setRetentionTerm(e.target.value)} className="w-16" />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat Kontrak</Button>
      </div>
    </div>
  );
}
