import { useState } from 'react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
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
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger id="ctr-client">
              <SelectValue placeholder="Pilih…" />
            </SelectTrigger>
            <SelectContent>
              {(clients?.items ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="ctr-project">Project (opsional)</Label>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger id="ctr-project">
              <SelectValue placeholder="Tanpa" />
            </SelectTrigger>
            <SelectContent>
              {(projects?.items ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Label htmlFor="ctr-title">Judul Kontrak</Label>
          <Input id="ctr-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ctr-type">Tipe</Label>
          <Select value={contractType} onValueChange={setContractType}>
            <SelectTrigger id="ctr-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LUMP_SUM">LUMP_SUM</SelectItem>
              <SelectItem value="UNIT_PRICE">UNIT_PRICE</SelectItem>
              <SelectItem value="COST_PLUS">COST_PLUS</SelectItem>
              <SelectItem value="TIME_MATERIAL">TIME_MATERIAL</SelectItem>
            </SelectContent>
          </Select>
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
