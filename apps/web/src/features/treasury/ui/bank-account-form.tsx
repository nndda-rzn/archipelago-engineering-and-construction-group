import { useState } from 'react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useCreateBankAccount } from '../model/treasury.api';
import { useLegalEntities } from '@/entities/legal-entity';

export function BankAccountForm() {
  const { data: entities } = useLegalEntities({ page: 1, pageSize: 100 });
  const create = useCreateBankAccount();
  const [legalEntityId, setLegalEntityId] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [currency, setCurrency] = useState('IDR');
  const [openingBalance, setOpeningBalance] = useState('');
  const onSubmit = () => {
    if (!legalEntityId || !bankCode || !bankName || !accountNumber || !accountName) return;
    create.mutate(
      { legalEntityId, bankCode, bankName, accountNumber, accountName, currency, openingBalance: openingBalance ? Number(openingBalance) : undefined },
      { onSuccess: () => { setBankCode(''); setBankName(''); setAccountNumber(''); setAccountName(''); setOpeningBalance(''); } },
    );
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="ba-entity">Entity</Label>
          <Select value={legalEntityId} onValueChange={setLegalEntityId}>
            <SelectTrigger id="ba-entity"><SelectValue placeholder="Pilih…" /></SelectTrigger>
            <SelectContent>
              {(entities?.items ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.code}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="ba-code">Kode Bank</Label>
          <Input id="ba-code" value={bankCode} onChange={(e) => setBankCode(e.target.value)} placeholder="BCA" />
        </div>
        <div className="flex-1">
          <Label htmlFor="ba-name">Nama Bank</Label>
          <Input id="ba-name" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank Central Asia" />
        </div>
        <div>
          <Label htmlFor="ba-num">No. Rekening</Label>
          <Input id="ba-num" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ba-acct">Atas Nama</Label>
          <Input id="ba-acct" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ba-ccy">Mata Uang</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger id="ba-ccy"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['IDR', 'USD', 'EUR', 'SGD', 'JPY'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="ba-bal">Saldo Awal</Label>
          <Input id="ba-bal" type="number" min={0} value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} className="w-32" />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat Rekening</Button>
      </div>
    </div>
  );
}
