import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { createVariationSchema } from '@aec/api-contracts';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useCreateVariation } from '../model/variation.api';

const formSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  title: createVariationSchema.shape.title,
  type: z.string(),
  amountChange: z.string().refine((v) => Number(v) > 0, 'Amount must be greater than 0'),
  scheduleImpactDays: z.string(),
  description: z.string().max(500),
});
type FormValues = z.infer<typeof formSchema>;

export function VariationForm({ onDone }: { onDone: () => void }) {
  const projects = useProjects({ page: 1, pageSize: 100 });
  const create = useCreateVariation();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { projectId: '', title: '', type: 'ADDITIVE', amountChange: '', scheduleImpactDays: '', description: '' },
  });

  const onSubmit = handleSubmit((input) =>
    create.mutate(
      {
        projectId: input.projectId,
        title: input.title,
        type: input.type,
        amountChange: Number(input.amountChange),
        scheduleImpactDays: input.scheduleImpactDays ? Number(input.scheduleImpactDays) : undefined,
        description: input.description || undefined,
      },
      { onSuccess: () => { reset(); onDone(); } },
    )
  );

  return (
    <form onSubmit={onSubmit} className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="vr-project">Project <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Controller name="projectId" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="vr-project"><SelectValue placeholder="Select project…" /></SelectTrigger>
              <SelectContent>
                {(projects.data?.items ?? []).map((project) => <SelectItem key={project.id} value={project.id}>{project.code}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
          {errors.projectId && <p className="mt-1 text-caption text-destructive-600">{errors.projectId.message}</p>}
        </div>
        <div>
          <Label htmlFor="vr-title">Variation Title <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="vr-title" placeholder="e.g. Additional scope for area X" error={!!errors.title} {...register('title')} />
          {errors.title && <p className="mt-1 text-caption text-destructive-600">{errors.title.message}</p>}
        </div>
        <div>
          <Label htmlFor="vr-type">Type</Label>
          <Controller name="type" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="vr-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ADDITIVE">ADDITIVE · increases contract</SelectItem>
                <SelectItem value="DEDUCTIVE">DEDUCTIVE · reduces contract</SelectItem>
              </SelectContent>
            </Select>
          )} />
        </div>
        <div>
          <Label htmlFor="vr-amount">Amount Change <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="vr-amount" type="number" min={0} step={100000} error={!!errors.amountChange} {...register('amountChange')} />
          {errors.amountChange && <p className="mt-1 text-caption text-destructive-600">{errors.amountChange.message}</p>}
        </div>
        <div>
          <Label htmlFor="vr-days">Schedule Impact (days)</Label>
          <Input id="vr-days" type="number" min={-3650} max={3650} placeholder="Optional" {...register('scheduleImpactDays')} />
        </div>
        <div>
          <Label htmlFor="vr-desc">Description</Label>
          <Input id="vr-desc" placeholder="Reason for variation…" {...register('description')} />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" loading={create.isPending}>Create POTENTIAL Variation</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Failed to create the variation.</p>}
    </form>
  );
}
