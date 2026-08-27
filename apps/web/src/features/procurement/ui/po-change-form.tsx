import { useState } from 'react';
import { Button, Input, Label } from '@aec/ui';
import { useCreatePoChange } from '@/features/procurement';

export function PoChangeForm({ poId }: { poId: string }) {
  const [newTotal, setNewTotal] = useState('');
  const [reason, setReason] = useState('');
  const create = useCreatePoChange(poId);

  const onSubmit = () => {
    const parsed = Number(newTotal);
    if (!parsed || !reason) return;
    create.mutate(
      { newTotal: parsed, reason },
      { onSuccess: () => { setNewTotal(''); setReason(''); } },
    );
  };

  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <h3 className="mb-3 text-h3 text-neutral-900">Ajukan PO Change</h3>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="pc-total">Total Baru (IDR)</Label>
          <Input id="pc-total" type="number" placeholder="0" value={newTotal} onChange={(e) => setNewTotal(e.target.value)} className="w-48" />
        </div>
        <div className="flex-1">
          <Label htmlFor="pc-reason">Alasan</Label>
          <Input id="pc-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Ajukan</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal mengajukan PO Change.</p>}
    </div>
  );
}
