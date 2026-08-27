import { useState } from 'react';
import { Button, Input, Label } from '@aec/ui';
import { useBankAccounts, useCreatePaymentProposal } from '../model/treasury.api';
import { useLegalEntities } from '@/entities/legal-entity';

export function ProposalForm() {
  const { data: entities } = useLegalEntities({ page: 1, pageSize: 100 });
  const { data: banks } = useBankAccounts({ page: 1, pageSize: 100 });
  const create = useCreatePaymentProposal();
  const [legalEntityId, setLegalEntityId] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [vendor, setVendor] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const onSubmit = () => {
    if (!legalEntityId || !vendor || !totalAmount) return;
    create.mutate(
      { legalEntityId, vendor, totalAmount: Number(totalAmount), bankAccountId: bankAccountId || undefined },
      { onSuccess: () => { setVendor(''); setTotalAmount(''); setBankAccountId(''); } },
    );
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="pp-entity">Entity</Label>
          <select id="pp-entity" value={legalEntityId} onChange={(e) => setLegalEntityId(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Pilih…</option>
            {(entities?.items ?? []).map((e) => <option key={e.id} value={e.id}>{e.code}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="pp-bank">Rekening</Label>
          <select id="pp-bank" value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">—</option>
            {(banks?.items ?? []).map((b) => <option key={b.id} value={b.id}>{b.bankName} {b.accountNumber}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <Label htmlFor="pp-vendor">Vendor</Label>
          <Input id="pp-vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="pp-amt">Nilai</Label>
          <Input id="pp-amt" type="number" min={0} value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} className="w-36" />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat Proposal</Button>
      </div>
    </div>
  );
}
