import { useState } from 'react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useCreateBankGuarantee } from '../model/treasury.api';
import { useLegalEntities } from '@/entities/legal-entity';
import { useProjects } from '@/entities/project';

export function GuaranteeForm() {
  const { data: entities } = useLegalEntities({ page: 1, pageSize: 100 });
  const { data: projects } = useProjects({ page: 1, pageSize: 100 });
  const create = useCreateBankGuarantee();
  const [legalEntityId, setLegalEntityId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [guaranteeType, setGuaranteeType] = useState('PERFORMANCE');
  const [beneficiary, setBeneficiary] = useState('');
  const [bankName, setBankName] = useState('');
  const [amount, setAmount] = useState('');
  const onSubmit = () => {
    if (!legalEntityId || !beneficiary || !bankName || !amount) return;
    create.mutate(
      { legalEntityId, projectId: projectId || undefined, guaranteeType, beneficiary, bankName, amount: Number(amount) },
      { onSuccess: () => { setBeneficiary(''); setBankName(''); setAmount(''); } },
    );
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="bg-entity">Entity</Label>
          <Select value={legalEntityId} onValueChange={setLegalEntityId}>
            <SelectTrigger id="bg-entity"><SelectValue placeholder="Pilih…" /></SelectTrigger>
            <SelectContent>
              {(entities?.items ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.code}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="bg-project">Project</Label>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger id="bg-project"><SelectValue placeholder="Pilih…" /></SelectTrigger>
            <SelectContent>
              {(projects?.items ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="bg-type">Tipe</Label>
          <Select value={guaranteeType} onValueChange={setGuaranteeType}>
            <SelectTrigger id="bg-type"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['BID', 'PERFORMANCE', 'ADVANCE', 'RETENTION', 'MAINTENANCE'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Label htmlFor="bg-benef">Beneficiary</Label>
          <Input id="bg-benef" value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="bg-bank">Bank</Label>
          <Input id="bg-bank" value={bankName} onChange={(e) => setBankName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="bg-amt">Nilai</Label>
          <Input id="bg-amt" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} className="w-32" />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat BG</Button>
      </div>
    </div>
  );
}
