import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller, useFieldArray, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { createPrSchema } from '@aec/api-contracts';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { Plus, Trash2 } from 'lucide-react';
import { useCreatePr } from '../model/procurement.api';
import { useProjects } from '@/entities/project';
import { useWbsTree } from '@/entities/wbs';
import { useUnsavedGuard } from '@/shared/lib/unsaved-guard';

const formSchema = z.object({
  projectId: z.string().min(1, 'Project wajib dipilih'),
  wbsItemId: z.string(),
  requestedBy: createPrSchema.shape.requestedBy,
  items: z.array(z.object({
    description: z.string(),
    quantity: z.string(),
    unit: z.string(),
    estimatedUnitPrice: z.string(),
  })).refine((items) => items.some((i) => i.description.trim() !== ''), 'Minimal satu item harus diisi'),
});
type FormValues = z.infer<typeof formSchema>;

const emptyItem = { description: '', quantity: '1', unit: 'EA', estimatedUnitPrice: '' };

export function PurchaseRequisitionForm({ onDone }: { onDone: () => void }) {
  const projects = useProjects({ page: 1, pageSize: 100 });
  const create = useCreatePr();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { projectId: '', wbsItemId: '', requestedBy: '', items: [{ ...emptyItem }] },
  });
  const { fields, append, remove, replace } = useFieldArray({ control, name: 'items' });

  const watched = useWatch({ control });
  const projectId = watched.projectId ?? '';
  const requestedBy = watched.requestedBy ?? '';
  const watchedItems = watched.items ?? [];
  useUnsavedGuard(projectId !== '' || requestedBy !== '' || watchedItems.some((i) => (i?.description ?? '').trim() !== ''));

  const { data: wbsTree } = useWbsTree(projectId);

  const flattenWbs = (nodes: { id: string; code: string; name: string; children: unknown[] }[]): { id: string; code: string; name: string }[] => nodes.flatMap((n) => [{ id: n.id, code: n.code, name: n.name }, ...flattenWbs(n.children as never)]);

  const onSubmit = handleSubmit((input) => {
    const validItems = input.items.filter((i) => i.description.trim()).map((i) => ({ description: i.description.trim(), quantity: Number(i.quantity) || 1, unit: i.unit || 'EA', estimatedUnitPrice: i.estimatedUnitPrice ? Number(i.estimatedUnitPrice) : undefined }));
    if (validItems.length === 0) return;
    create.mutate({ projectId: input.projectId, wbsItemId: input.wbsItemId || undefined, requestedBy: input.requestedBy, items: validItems }, { onSuccess: () => { reset({ projectId: '', wbsItemId: '', requestedBy: '', items: [{ ...emptyItem }] }); onDone(); } });
  });

  return (
    <form onSubmit={onSubmit} className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <Label htmlFor="pr-project">Project <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Controller name="projectId" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={(v) => { field.onChange(v); replace([{ ...emptyItem }]); }}>
              <SelectTrigger id="pr-project"><SelectValue placeholder="Pilih project…" /></SelectTrigger>
              <SelectContent>
                {(projects.data?.items ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
          {errors.projectId && <p className="mt-1 text-caption text-destructive-600">{errors.projectId.message}</p>}
        </div>
        <div>
          <Label htmlFor="pr-wbs">WBS (opsional)</Label>
          <Controller name="wbsItemId" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange} disabled={!projectId}>
              <SelectTrigger id="pr-wbs"><SelectValue placeholder="Tanpa WBS" /></SelectTrigger>
              <SelectContent>
                {flattenWbs(wbsTree ?? []).map((w) => <SelectItem key={w.id} value={w.id}>{w.code} {w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </div>
        <div>
          <Label htmlFor="pr-requested">Diminta Oleh <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="pr-requested" placeholder="Nama pemohon" error={!!errors.requestedBy} {...register('requestedBy')} />
          {errors.requestedBy && <p className="mt-1 text-caption text-destructive-600">{errors.requestedBy.message}</p>}
        </div>
      </div>
      <div className="mt-4">
        <div className="mb-2 text-body-sm font-medium text-neutral-700">Item</div>
        {fields.map((field, idx) => (
          <div key={field.id} className="mb-2 grid grid-cols-12 gap-2">
            <Input className="col-span-5" placeholder="Deskripsi item" {...register(`items.${idx}.description`)} />
            <Input className="col-span-2" type="number" placeholder="Qty" {...register(`items.${idx}.quantity`)} />
            <Input className="col-span-2" placeholder="Unit" {...register(`items.${idx}.unit`)} />
            <Input className="col-span-2" type="number" placeholder="Est. harga" {...register(`items.${idx}.estimatedUnitPrice`)} />
            <Button className="col-span-1" variant="ghost" size="icon" type="button" aria-label="Hapus item" onClick={() => remove(idx)}><Trash2 className="h-4 w-4" aria-hidden="true" /></Button>
          </div>
        ))}
        {errors.items && <p className="mb-2 text-caption text-destructive-600">{errors.items.message}</p>}
        <Button type="button" variant="secondary" size="sm" onClick={() => append({ ...emptyItem })}><Plus className="h-4 w-4" aria-hidden="true" /> Tambah Item</Button>
      </div>
      <div className="mt-4 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onDone}>Batal</Button><Button type="submit" loading={create.isPending}>Simpan PR</Button></div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal membuat PR.</p>}
    </form>
  );
}
