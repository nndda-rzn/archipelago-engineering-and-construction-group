import { useState } from 'react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
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
          <Select value={legalEntityId} onValueChange={setLegalEntityId}>
            <SelectTrigger id="pp-entity"><SelectValue placeholder="Pilih…" /></SelectTrigger>
            <SelectContent>
              {(entities?.items ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.code}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="pp-bank">Rekening</Label>
          <Select value={bankAccountId} onValueChange={setBankAccountId}>
            <SelectTrigger id="pp-bank"><SelectValue placeholder="Pilih…" /></SelectTrigger>
            <SelectContent>
              {(banks?.items ?? []).map((b) => <SelectItem key={b.id} value={b.id}>{b.bankName} {b.accountNumber}</SelectItem>)}
            </SelectContent>
          </Select>
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
