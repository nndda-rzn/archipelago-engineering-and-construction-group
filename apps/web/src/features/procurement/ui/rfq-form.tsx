import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { createRfqSchema } from '@aec/api-contracts';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useCreateRfq } from '../model/procurement.api';

const formSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  title: createRfqSchema.shape.title,
  dueDate: z.string(),
  lines: z.array(z.object({
    description: z.string(),
    quantity: z.number(),
    unit: z.string(),
  })).refine((lines) => lines.some((l) => l.description && l.quantity > 0), 'At least one item with a description and qty > 0'),
});
type FormValues = z.infer<typeof formSchema>;

export function RfqForm({ onDone }: { onDone: () => void }) {
  const projects = useProjects({ page: 1, pageSize: 100 });
  const create = useCreateRfq();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { projectId: '', title: '', dueDate: '', lines: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });

  const onSubmit = handleSubmit((input) => {
    const items = input.lines.filter((l) => l.description && l.quantity > 0);
    create.mutate(
      { projectId: input.projectId, title: input.title, dueDate: input.dueDate || undefined, items },
      { onSuccess: () => { reset(); onDone(); } },
    );
  });

  return (
    <form onSubmit={onSubmit} className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="rfq-project">Project <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Controller name="projectId" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="rfq-project">
                <SelectValue placeholder="Select project…" />
              </SelectTrigger>
              <SelectContent>
                {(projects.data?.items ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
          {errors.projectId && <p className="mt-1 text-caption text-destructive-600">{errors.projectId.message}</p>}
        </div>
        <div>
          <Label htmlFor="rfq-title">Title <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="rfq-title" placeholder="Material procurement…" error={!!errors.title} {...register('title')} />
          {errors.title && <p className="mt-1 text-caption text-destructive-600">{errors.title.message}</p>}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-neutral-200">
        <table className="w-full text-left text-body">
          <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2">Unit</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => (
              <tr key={field.id} className="border-t border-neutral-100">
                <td className="px-3 py-2">
                  <Input placeholder="e.g. Steel Section" className="h-8 w-full" {...register(`lines.${index}.description`)} />
                </td>
                <td className="px-3 py-2">
                  <Controller name={`lines.${index}.quantity`} control={control} render={({ field: f }) => (
                    <Input type="number" min={0.01} className="h-8 w-24 text-right" value={f.value || ''} onChange={(e) => f.onChange(Number(e.target.value))} />
                  )} />
                </td>
                <td className="px-3 py-2">
                  <Input className="h-8 w-20" {...register(`lines.${index}.unit`)} />
                </td>
                <td className="px-3 py-2 text-right">
                  <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>Remove</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {fields.length === 0 && <p className="p-3 text-caption text-neutral-500">No RFQ items yet.</p>}
      </div>
      {errors.lines && <p className="mt-2 text-caption text-destructive-600">{errors.lines.message}</p>}

      <div className="mt-3 flex items-center justify-between">
        <div>
          <Label htmlFor="rfq-due">Submission Deadline (optional)</Label>
          <Input
            id="rfq-due"
            type="date"
            className="mt-1 w-44"
            {...register('dueDate')}
          />
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => append({ description: '', quantity: 1, unit: 'EA' })}>+ Add Item</Button>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" loading={create.isPending}>Create RFQ DRAFT</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Failed to create the RFQ.</p>}
    </form>
  );
}
