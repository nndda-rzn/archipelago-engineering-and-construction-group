import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller, useFieldArray, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { createCollectionSchema } from '@aec/api-contracts';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useCreateCollection } from '../model/collection.api';
import { useClientInvoices } from '../model/client-invoice.api';
import { formatIdr } from '@/shared/lib/format';

const formSchema = z.object({
  projectId: z.string().min(1, 'Project wajib dipilih'),
  client: createCollectionSchema.shape.client,
  reference: z.string().max(100),
  items: z.array(z.object({
    clientInvoiceId: z.string(),
    amount: z.number(),
  })).refine((items) => items.some((i) => i.amount > 0), 'Pilih minimal satu invoice dengan jumlah > 0'),
});
type FormValues = z.infer<typeof formSchema>;

export function CollectionForm({ onDone }: { onDone: () => void }) {
  const projects = useProjects({ page: 1, pageSize: 100 });
  const invoices = useClientInvoices({ page: 1, pageSize: 100 });
  const postedInvoices = (invoices.data?.items ?? []).filter((inv) => inv.status === 'POSTED');
  const create = useCreateCollection();

  const { register, handleSubmit, reset, control, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { projectId: '', client: '', reference: '', items: [] },
  });
  const { fields, append, remove, replace } = useFieldArray({ control, name: 'items' });
  const lines = useWatch({ control, name: 'items' });

  const onSubmit = handleSubmit((input) => {
    const items = input.items
      .filter((l) => l.amount > 0)
      .map((l) => ({ clientInvoiceId: l.clientInvoiceId, amount: l.amount }));
    create.mutate(
      { projectId: input.projectId, client: input.client, reference: input.reference || undefined, items },
      { onSuccess: () => { reset(); onDone(); } },
    );
  });

  return (
    <form onSubmit={onSubmit} className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="col-project">Project <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Controller name="projectId" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={(v) => { field.onChange(v); replace([]); }}>
              <SelectTrigger id="col-project"><SelectValue placeholder="Pilih project…" /></SelectTrigger>
              <SelectContent>
                {(projects.data?.items ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
          {errors.projectId && <p className="mt-1 text-caption text-destructive-600">{errors.projectId.message}</p>}
        </div>
        <div>
          <Label htmlFor="col-client">Klien <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="col-client" placeholder="PT Klien Utama" error={!!errors.client} {...register('client')} />
          {errors.client && <p className="mt-1 text-caption text-destructive-600">{errors.client.message}</p>}
        </div>
        <div>
          <Label htmlFor="col-ref">Referensi (opsional)</Label>
          <Input id="col-ref" {...register('reference')} />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-neutral-200">
        <table className="w-full text-left text-body">
          <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
            <tr><th className="px-3 py-2">Client Invoice POSTED</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2 text-right">Diterima</th><th className="px-3 py-2"></th></tr>
          </thead>
          <tbody>
            {postedInvoices.map((inv) => {
              const index = fields.findIndex((f) => f.clientInvoiceId === inv.id);
              const added = index >= 0;
              const line = added ? lines?.[index] : undefined;
              return (
                <tr key={inv.id} className="border-t border-neutral-100">
                  <td className="px-3 py-2 font-mono text-neutral-700">{inv.invoiceNumber}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-neutral-600">{formatIdr(Number(inv.totalAmount))}</td>
                  <td className="px-3 py-2">
                    {added ? <Input type="number" min={0} step={100000} value={line?.amount || ''} onChange={(e) => setValue(`items.${index}.amount`, Number(e.target.value))} className="h-8 w-32 text-right" /> : <span className="text-caption text-neutral-400">-</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {added ? <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>Batal</Button> : <Button type="button" variant="secondary" size="sm" onClick={() => append({ clientInvoiceId: inv.id, amount: Number(inv.totalAmount ?? 0) })}>+ Pilih</Button>}
                  </td>
                </tr>
              );
            })}
            {postedInvoices.length === 0 && <tr><td colSpan={4} className="p-3 text-caption text-neutral-500">Tidak ada client invoice POSTED.</td></tr>}
          </tbody>
        </table>
      </div>
      {errors.items && <p className="mt-2 text-caption text-destructive-600">{errors.items.message}</p>}

      <div className="mt-4 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onDone}>Batal</Button><Button type="submit" loading={create.isPending}>Buat Collection DRAFT</Button></div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal. Jumlah tidak boleh melebihi sisa piutang.</p>}
    </form>
  );
}
