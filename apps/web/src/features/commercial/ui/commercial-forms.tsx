import { useState } from 'react';
import { Button, Input, Label } from '@aec/ui';
import { useClients, useCreateClient, useCreateOpportunity, useCreateContract } from '../model/commercial.api';
import { useProjects } from '@/entities/project';

export function ClientForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const create = useCreateClient();
  const onSubmit = () => {
    if (!name) return;
    create.mutate(
      { name, industry: industry || undefined, contactPerson: contactPerson || undefined, email: email || undefined },
      { onSuccess: () => { setName(''); setIndustry(''); setContactPerson(''); setEmail(''); onDone(); } },
    );
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="clt-name">Nama Client</Label>
          <Input id="clt-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="clt-industry">Industri</Label>
          <Input id="clt-industry" value={industry} onChange={(e) => setIndustry(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="clt-contact">Kontak</Label>
          <Input id="clt-contact" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="clt-email">Email</Label>
          <Input id="clt-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat Client</Button>
      </div>
    </div>
  );
}

export function OpportunityForm({ onDone }: { onDone: () => void }) {
  const { data: clients } = useClients({ page: 1, pageSize: 100 });
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [expectedValue, setExpectedValue] = useState('');
  const [owner, setOwner] = useState('');
  const create = useCreateOpportunity();
  const onSubmit = () => {
    if (!clientId || !title || !expectedValue || !owner) return;
    create.mutate(
      { clientId, title, expectedValue: Number(expectedValue), owner },
      { onSuccess: () => { setTitle(''); setExpectedValue(''); setOwner(''); onDone(); } },
    );
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="opp-client">Client</Label>
          <select id="opp-client" value={clientId} onChange={(e) => setClientId(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Pilih…</option>
            {(clients?.items ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <Label htmlFor="opp-title">Judul</Label>
          <Input id="opp-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="opp-value">Nilai</Label>
          <Input id="opp-value" type="number" min={0} value={expectedValue} onChange={(e) => setExpectedValue(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="opp-owner">Owner</Label>
          <Input id="opp-owner" value={owner} onChange={(e) => setOwner(e.target.value)} />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat Opportunity</Button>
      </div>
    </div>
  );
}

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
