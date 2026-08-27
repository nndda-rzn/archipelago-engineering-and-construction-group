import { useState } from 'react';
import { Button, Input, Label } from '@aec/ui';
import { useCreateOrganization } from '../model/foundation-hardening.api';
import { useLegalEntities } from '@/entities/legal-entity';

export function OrgForm() {
  const { data: entities } = useLegalEntities({ page: 1, pageSize: 100 });
  const create = useCreateOrganization();
  const [legalEntityId, setLegalEntityId] = useState('');
  const [name, setName] = useState('');
  const [orgType, setOrgType] = useState('BUSINESS_UNIT');
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="orgf-entity">Entity</Label>
          <select id="orgf-entity" value={legalEntityId} onChange={(e) => setLegalEntityId(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Pilih…</option>
            {(entities?.items ?? []).map((e) => <option key={e.id} value={e.id}>{e.code}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <Label htmlFor="orgf-name">Nama</Label>
          <Input id="orgf-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="orgf-type">Tipe</Label>
          <select id="orgf-type" value={orgType} onChange={(e) => setOrgType(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            {['GROUP', 'LEGAL_ENTITY', 'BUSINESS_UNIT', 'DIVISION', 'REGION', 'BRANCH', 'DEPARTMENT', 'SECTION'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <Button onClick={() => { if (legalEntityId && name) create.mutate({ legalEntityId, name, orgType }, { onSuccess: () => setName('') }); }} loading={create.isPending}>
          Buat
        </Button>
      </div>
    </div>
  );
}
