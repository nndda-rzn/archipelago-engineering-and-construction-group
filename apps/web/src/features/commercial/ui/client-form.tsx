import { useState } from 'react';
import { Button, Input, Label } from '@aec/ui';
import { useCreateClient } from '../model/commercial.api';

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
