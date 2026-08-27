import { useState } from 'react';
import { Button, Input, Label } from '@aec/ui';
import { useClients, useCreateOpportunity } from '../model/commercial.api';

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
