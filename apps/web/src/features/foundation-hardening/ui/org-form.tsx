import { useState } from 'react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
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
          <Select value={legalEntityId} onValueChange={setLegalEntityId}>
            <SelectTrigger id="orgf-entity">
              <SelectValue placeholder="Pilih…" />
            </SelectTrigger>
            <SelectContent>
              {(entities?.items ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.code}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Label htmlFor="orgf-name">Nama</Label>
          <Input id="orgf-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="orgf-type">Tipe</Label>
          <Select value={orgType} onValueChange={setOrgType}>
            <SelectTrigger id="orgf-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['GROUP', 'LEGAL_ENTITY', 'BUSINESS_UNIT', 'DIVISION', 'REGION', 'BRANCH', 'DEPARTMENT', 'SECTION'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { if (legalEntityId && name) create.mutate({ legalEntityId, name, orgType }, { onSuccess: () => setName('') }); }} loading={create.isPending}>
          Buat
        </Button>
      </div>
    </div>
  );
}
