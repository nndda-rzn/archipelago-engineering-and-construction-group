import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { usePos } from '@/features/procurement';
import { useCreateGoodsReceipt } from '../model/goods-receipt.api';
import { useWarehouses } from '../model/warehouse.api';
import { UnsavedGuard } from '@/shared/lib/unsaved-guard';

const schema = z.object({ poId: z.string().min(1, 'PO wajib dipilih'), warehouseId: z.string().min(1, 'Warehouse wajib dipilih'), remark: z.string(), quantities: z.record(z.string(), z.string()) });
type Values = z.infer<typeof schema>;

export function ReceiptForm({ onDone }: { onDone: () => void }) {
  const pos = usePos({ page: 1, pageSize: 100 });
  const releasedPos = (pos.data?.items ?? []).filter((po) => po.status === 'RELEASED');
  const warehouses = useWarehouses({ page: 1, pageSize: 100 });
  const create = useCreateGoodsReceipt();
  const { register, handleSubmit, reset, control, formState: { errors, isDirty } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { poId: '', warehouseId: '', remark: '', quantities: {} } });
  const poId = useWatch({ control, name: 'poId' });
  const warehouseId = useWatch({ control, name: 'warehouseId' });
  const remark = useWatch({ control, name: 'remark' });
  const selectedPo = releasedPos.find((po) => po.id === poId);
  const onSubmit = handleSubmit(({ poId, warehouseId, remark, quantities }) => {
    const items = (selectedPo?.items ?? []).map((item) => ({ poItemId: item.id, quantity: Number(quantities[item.id] || 0) })).filter((item) => item.quantity > 0);
    if (!items.length) return;
    create.mutate({ poId, warehouseId, remark: remark || undefined, items }, { onSuccess: () => { reset(); onDone(); } });
  });
  return (
    <form onSubmit={onSubmit} className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <UnsavedGuard dirty={isDirty} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div><Label htmlFor="gr-po">PO (harus RELEASED) <span aria-hidden="true" className="text-destructive-600">*</span></Label><Controller name="poId" control={control} render={({ field }) => <Select value={field.value} onValueChange={(v) => { field.onChange(v); reset({ poId: v, warehouseId: warehouseId, remark: remark, quantities: {} }); }}><SelectTrigger id="gr-po"><SelectValue placeholder="Pilih PO…" /></SelectTrigger><SelectContent>{releasedPos.map((po) => <SelectItem key={po.id} value={po.id}>{po.poNumber} - {po.vendor}</SelectItem>)}</SelectContent></Select>} />{errors.poId && <p role="alert" className="mt-1 text-caption text-destructive-600">{errors.poId.message}</p>}{releasedPos.length === 0 && <p className="mt-1 text-caption text-neutral-500">Tidak ada PO RELEASED. Release PO dulu.</p>}</div>
        <div><Label htmlFor="gr-wh">Warehouse <span aria-hidden="true" className="text-destructive-600">*</span></Label><Controller name="warehouseId" control={control} render={({ field }) => <Select value={field.value} onValueChange={field.onChange}><SelectTrigger id="gr-wh"><SelectValue placeholder="Pilih warehouse…" /></SelectTrigger><SelectContent>{(warehouses.data?.items ?? []).map((wh) => <SelectItem key={wh.id} value={wh.id}>{wh.code} - {wh.name}</SelectItem>)}</SelectContent></Select>} />{errors.warehouseId && <p role="alert" className="mt-1 text-caption text-destructive-600">{errors.warehouseId.message}</p>}</div>
      </div>
      {selectedPo && <div className="mt-4 overflow-hidden rounded-md border border-neutral-200"><table className="w-full text-left text-body"><thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500"><tr><th className="px-3 py-2">Deskripsi</th><th className="px-3 py-2 text-right">Qty PO</th><th className="px-3 py-2">Unit</th><th className="px-3 py-2">Unit Price</th><th className="px-3 py-2">Qty Diterima</th></tr></thead><tbody>{selectedPo.items.map((item) => <tr key={item.id} className="border-t border-neutral-100"><td className="px-3 py-2 text-neutral-700">{item.description}</td><td className="px-3 py-2 text-right tabular-nums text-neutral-700">{item.quantity}</td><td className="px-3 py-2 text-neutral-600">{item.unit}</td><td className="px-3 py-2 text-right tabular-nums text-neutral-600">{item.unitPrice}</td><td className="px-3 py-2"><Input type="number" min={0} max={item.quantity} step={1} {...register(`quantities.${item.id}`)} className="h-8 w-28" /></td></tr>)}</tbody></table></div>}
      <div className="mt-4"><Label htmlFor="gr-remark">Remark</Label><Input id="gr-remark" {...register('remark')} /></div>
      <div className="mt-4 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onDone}>Batal</Button><Button type="submit" loading={create.isPending} disabled={!selectedPo}>Post Goods Receipt</Button></div>
      {create.isError && <p role="alert" className="mt-2 text-caption text-destructive-600">Gagal posting. PO harus RELEASED dan qty tidak boleh melebihi outstanding.</p>}
    </form>
  );
}

