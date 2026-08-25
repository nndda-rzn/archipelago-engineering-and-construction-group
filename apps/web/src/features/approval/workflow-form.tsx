import { useState } from 'react';
import { Button, Input, Label } from '@aec/ui';
import { useCreateWorkflowDefinition } from './approval.api';

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
          <select
            id="wf-type"
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value)}
            className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="PurchaseRequisition">PurchaseRequisition</option>
            <option value="PurchaseOrder">PurchaseOrder</option>
          </select>
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