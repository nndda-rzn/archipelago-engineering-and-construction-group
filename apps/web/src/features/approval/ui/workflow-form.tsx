import { useState } from 'react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useCreateWorkflowDefinition } from '../model/approval.api';

export function CreateWorkflowForm({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [transactionType, setTransactionType] = useState('PurchaseRequisition');
  const create = useCreateWorkflowDefinition();

  const onSubmit = () => {
    if (!code || !name) return;
    create.mutate(
      { code, name, transactionType: transactionType as 'PurchaseRequisition' | 'PurchaseOrder' },
      { onSuccess: () => { setCode(''); setName(''); onDone(); } },
    );
  };

  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="wf-code">Kode</Label>
          <Input id="wf-code" placeholder="mis. SUB_APPROVAL" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="wf-name">Nama</Label>
          <Input id="wf-name" placeholder="Approval Subkontrak" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="wf-type">Tipe Transaksi</Label>
          <Select value={transactionType} onValueChange={setTransactionType}>
            <SelectTrigger id="wf-type">
              <SelectValue placeholder="Pilih tipe…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PurchaseRequisition">PurchaseRequisition</SelectItem>
              <SelectItem value="PurchaseOrder">PurchaseOrder</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="button" onClick={onSubmit} loading={create.isPending}>Buat Workflow v1</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Kode workflow sudah ada.</p>}
    </div>
  );
}