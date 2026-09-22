import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller, useFieldArray, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { createVendorInvoiceSchema } from '@aec/api-contracts';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { usePos } from '@/features/procurement';
import { useCreateVendorInvoice } from '../model/finance.api';
import { UnsavedGuard } from '@/shared/lib/unsaved-guard';

const formSchema = z.object({
  poId: z.string().min(1, 'PO wajib dipilih'),
  vendorInvoiceNo: createVendorInvoiceSchema.shape.vendorInvoiceNo,
  taxAmount: z.string(),
  lines: z.array(z.object({
    poItemId: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
  })).refine((lines) => lines.some((l) => l.quantity > 0), 'Pilih minimal satu item dengan qty > 0'),
});
type FormValues = z.infer<typeof formSchema>;

export function InvoiceForm({ onDone }: { onDone: () => void }) {
  const pos = usePos({ page: 1, pageSize: 100 });
  const releasedPos = (pos.data?.items ?? []).filter((po) => po.status === 'RELEASED');
  const create = useCreateVendorInvoice();

  const { register, handleSubmit, reset, control, setValue, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { poId: '', vendorInvoiceNo: '', taxAmount: '', lines: [] },
  });
  const { fields, append, remove, replace } = useFieldArray({ control, name: 'lines' });
  const lines = useWatch({ control, name: 'lines' });
  const poId = useWatch({ control, name: 'poId' });

  const selectedPo = releasedPos.find((po) => po.id === poId);

  const onSubmit = handleSubmit((input) => {
    const items = input.lines
      .filter((l) => l.quantity > 0)
      .map((l) => ({ poItemId: l.poItemId, quantity: l.quantity, unitPrice: l.unitPrice }));
    create.mutate(
      { poId: input.poId, vendorInvoiceNo: input.vendorInvoiceNo, taxAmount: input.taxAmount ? Number(input.taxAmount) : undefined, items },
      { onSuccess: () => { reset(); onDone(); } },
    );
  });

  return (
    <form onSubmit={onSubmit} className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <UnsavedGuard dirty={isDirty} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <Label htmlFor="inv-po">PO (harus RELEASED) <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Controller name="poId" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={(v) => { field.onChange(v); replace([]); }}>
              <SelectTrigger id="inv-po"><SelectValue placeholder="Pilih PO…" /></SelectTrigger>
              <SelectContent>
                {releasedPos.map((po) => <SelectItem key={po.id} value={po.id}>{po.poNumber} — {po.vendor}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
          {releasedPos.length === 0 && <p className="mt-1 text-caption text-neutral-500">Tidak ada PO RELEASED.</p>}
          {errors.poId && <p className="mt-1 text-caption text-destructive-600">{errors.poId.message}</p>}
        </div>
        <div>
          <Label htmlFor="inv-no">No. Invoice Vendor <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="inv-no" placeholder="V-2026-001" error={!!errors.vendorInvoiceNo} {...register('vendorInvoiceNo')} />
          {errors.vendorInvoiceNo && <p className="mt-1 text-caption text-destructive-600">{errors.vendorInvoiceNo.message}</p>}
        </div>
        <div>
          <Label htmlFor="inv-tax">Pajak (opsional)</Label>
          <Input id="inv-tax" type="number" placeholder="0" {...register('taxAmount')} />
        </div>
      </div>
      {selectedPo && (
        <div className="mt-4 overflow-hidden rounded-md border border-neutral-200">
          <table className="w-full text-left text-body">
            <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-3 py-2">Item PO</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Unit Price</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {selectedPo.items.map((item) => {
                const index = fields.findIndex((f) => f.poItemId === item.id);
                const added = index >= 0;
                const line = added ? lines?.[index] : undefined;
                return (
                  <tr key={item.id} className="border-t border-neutral-100">
                    <td className="px-3 py-2 text-neutral-700">{item.description} <span className="text-caption text-neutral-500">(qty PO {item.quantity} {item.unit})</span></td>
                    <td className="px-3 py-2">
                      {added ? (
                        <Input type="number" min={0} step={1} value={line?.quantity || ''} onChange={(e) => setValue(`lines.${index}.quantity`, Number(e.target.value))} className="h-8 w-24 text-right" />
                      ) : (<span className="text-caption text-neutral-500">belum dipilih</span>)}
                    </td>
                    <td className="px-3 py-2">
                      {added && <Input type="number" min={0} step={1000} value={line?.unitPrice || ''} onChange={(e) => setValue(`lines.${index}.unitPrice`, Number(e.target.value))} className="h-8 w-28 text-right" />}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {added ? <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>Batal</Button> : <Button type="button" variant="secondary" size="sm" onClick={() => append({ poItemId: item.id, quantity: 0, unitPrice: 0 })}>+ Pilih</Button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {errors.lines && <p className="mt-2 text-caption text-destructive-600">{errors.lines.message}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="submit" loading={create.isPending}>Buat Invoice</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal. Qty invoice tidak boleh melebihi qty diterima (3-way match).</p>}
    </form>
  );
}
