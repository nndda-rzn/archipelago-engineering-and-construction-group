import { useState } from 'react';
import { Button, Input, Label } from '@aec/ui';
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
          <select id="bg-entity" value={legalEntityId} onChange={(e) => setLegalEntityId(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Pilih…</option>
            {(entities?.items ?? []).map((e) => <option key={e.id} value={e.id}>{e.code}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="bg-project">Project</Label>
          <select id="bg-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">—</option>
            {(projects?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="bg-type">Tipe</Label>
          <select id="bg-type" value={guaranteeType} onChange={(e) => setGuaranteeType(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            {['BID', 'PERFORMANCE', 'ADVANCE', 'RETENTION', 'MAINTENANCE'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
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
