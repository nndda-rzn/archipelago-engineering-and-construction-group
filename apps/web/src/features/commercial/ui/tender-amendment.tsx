import { useState } from 'react';
import { Button, DataGrid, Input, Label } from '@aec/ui';
import { useCreateAmendment } from '../model/tender.api';
import type { ContractAmendment } from '@aec/api-contracts';
import { amendmentColumns } from './tender-grid';
import type { ContractOption } from './tender-types';

export function AmendmentPanel({
  contractId, setContractId, contracts, amendments, loading,
}: {
  contractId: string; setContractId: (v: string) => void; contracts: ContractOption[];
  amendments: ContractAmendment[]; loading: boolean;
}) {
  const create = useCreateAmendment(contractId);
  const [title, setTitle] = useState('');
  const [amountChange, setAmountChange] = useState('');
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
        <div className="w-72">
          <Label htmlFor="amd-contract">Kontrak</Label>
          <select id="amd-contract" value={contractId} onChange={(e) => setContractId(e.target.value)} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Pilih…</option>
            {contracts.map((c) => <option key={c.id} value={c.id}>{c.contractNumber} — {c.title}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <Label htmlFor="amd-title">Judul</Label>
          <Input id="amd-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="amd-chg">Perubahan</Label>
          <Input id="amd-chg" type="number" value={amountChange} onChange={(e) => setAmountChange(e.target.value)} className="w-36" placeholder="+/−" />
        </div>
        <Button onClick={() => { if (contractId && title && amountChange) create.mutate({ title, amountChange: Number(amountChange) }, { onSuccess: () => { setTitle(''); setAmountChange(''); } }); }} loading={create.isPending}>
          Buat Amendment
        </Button>
      </div>

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        <DataGrid columns={amendmentColumns} data={loading ? [] : amendments} rowCount={loading ? 0 : amendments.length} isLoading={loading} isError={false} emptyMessage="Belum ada amendment" />
      </div>
    </div>
  );
}
