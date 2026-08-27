import { useState } from 'react';
import { Button, Input, Label } from '@aec/ui';
import { useCreateChartOfAccount } from '../model/chart-of-account.api';
import { useChartOfAccounts } from '../model/chart-of-account.api';

export function CoaForm({ onDone, entityId }: { onDone: () => void; entityId: string }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState('ASSET');
  const [normalBalance, setNormalBalance] = useState('DEBIT');
  const [description, setDescription] = useState('');
  const create = useCreateChartOfAccount();
  const { data: accounts } = useChartOfAccounts({ legalEntityId: entityId });

  const onSubmit = () => {
    if (!code || !name) return;
    create.mutate({ legalEntityId: entityId, code, name, accountType, normalBalance, description: description || undefined }, { onSuccess: () => { setCode(''); setName(''); setDescription(''); onDone(); } });
  };

  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-2 gap-4">
        <div><Label htmlFor="coa-code">Kode</Label><Input id="coa-code" placeholder="mis. 1300" value={code} onChange={(e) => setCode(e.target.value)} /></div>
        <div><Label htmlFor="coa-name">Nama</Label><Input id="coa-name" placeholder="mis. Aset Tetap" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div>
          <Label htmlFor="coa-type">Tipe Akun</Label>
          <select id="coa-type" value={accountType} onChange={(e) => setAccountType(e.target.value)} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body"><option value="ASSET">Aset</option><option value="LIABILITY">Liabilitas</option><option value="EQUITY">Ekuitas</option><option value="REVENUE">Pendapatan</option><option value="EXPENSE">Beban</option></select>
        </div>
        <div>
          <Label htmlFor="coa-balance">Saldo Normal</Label>
          <select id="coa-balance" value={normalBalance} onChange={(e) => setNormalBalance(e.target.value)} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body"><option value="DEBIT">Debit</option><option value="CREDIT">Kredit</option></select>
        </div>
        <div className="col-span-2"><Label htmlFor="coa-desc">Deskripsi (opsional)</Label><Input id="coa-desc" placeholder="Keterangan akun" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      </div>
      <div className="mt-4 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onDone}>Batal</Button><Button type="button" onClick={onSubmit} loading={create.isPending}>Simpan Akun</Button></div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Kode akun sudah ada / data tidak valid.</p>}
      {accounts && accounts.length > 0 && <p className="mt-3 text-caption text-neutral-500">{accounts.length} akun terdaftar — format kode: 1xxx Aset, 2xxx Liabilitas, 3xxx Ekuitas, 4xxx Pendapatan, 6xxx Beban.</p>}
    </div>
  );
}
