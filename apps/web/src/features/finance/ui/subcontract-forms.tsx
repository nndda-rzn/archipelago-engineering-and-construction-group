import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { createSubcontractSchema } from '@aec/api-contracts';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useCreateSubcontract, useCreateSubcontractProgress } from '../model/subcontract.api';
import type { Subcontract } from '@aec/api-contracts';

const subconSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  vendor: createSubcontractSchema.shape.vendor,
  title: createSubcontractSchema.shape.title,
  contractValue: z.string().refine((v) => Number(v) > 0, 'Contract value must be greater than 0'),
});
type SubconValues = z.infer<typeof subconSchema>;

export function SubconForm({ onDone }: { onDone: () => void }) {
  const projects = useProjects({ page: 1, pageSize: 100 });
  const create = useCreateSubcontract();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<SubconValues>({
    resolver: zodResolver(subconSchema),
    defaultValues: { projectId: '', vendor: '', title: '', contractValue: '' },
  });

  const onSubmit = handleSubmit((input) =>
    create.mutate(
      { projectId: input.projectId, vendor: input.vendor, title: input.title, contractValue: Number(input.contractValue) },
      { onSuccess: () => { reset(); onDone(); } },
    )
  );

  return (
    <form onSubmit={onSubmit} className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="sc-project">Project <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Controller name="projectId" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="sc-project"><SelectValue placeholder="Select project…" /></SelectTrigger>
              <SelectContent>
                {(projects.data?.items ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
          {errors.projectId && <p className="mt-1 text-caption text-destructive-600">{errors.projectId.message}</p>}
        </div>
        <div>
          <Label htmlFor="sc-vendor">Subcontractor Vendor <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="sc-vendor" placeholder="PT. Subkon Sejahtera" error={!!errors.vendor} {...register('vendor')} />
          {errors.vendor && <p className="mt-1 text-caption text-destructive-600">{errors.vendor.message}</p>}
        </div>
        <div>
          <Label htmlFor="sc-title">Work Title <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="sc-title" placeholder="e.g. Steel structure area B" error={!!errors.title} {...register('title')} />
          {errors.title && <p className="mt-1 text-caption text-destructive-600">{errors.title.message}</p>}
        </div>
        <div>
          <Label htmlFor="sc-value">Contract Value <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="sc-value" type="number" min={0} step={100000} error={!!errors.contractValue} {...register('contractValue')} />
          {errors.contractValue && <p className="mt-1 text-caption text-destructive-600">{errors.contractValue.message}</p>}
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" loading={create.isPending}>Create Subcontract</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Failed to create the subcontract.</p>}
    </form>
  );
}

const progressSchema = z.object({
  progressPercent: z.string().refine((v) => Number(v) >= 0 && Number(v) <= 100, 'Progress 0–100'),
  period: z.string().max(30),
});
type ProgressValues = z.infer<typeof progressSchema>;

export function ProgressForm({ subcontract }: { subcontract: Subcontract }) {
  const create = useCreateSubcontractProgress();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProgressValues>({
    resolver: zodResolver(progressSchema),
    defaultValues: { progressPercent: '', period: '' },
  });

  const onSubmit = handleSubmit((input) =>
    create.mutate(
      { subcontractId: subcontract.id, progressPercent: Number(input.progressPercent), period: input.period || undefined },
      { onSuccess: () => reset() },
    )
  );

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
      <div><Label htmlFor="scp-period">Period</Label><Input id="scp-period" placeholder="e.g. 2026-09" {...register('period')} /></div>
      <div>
        <Label htmlFor="scp-progress">Physical Progress (%)</Label>
        <Input id="scp-progress" type="number" min={0} max={100} placeholder="e.g. 35" error={!!errors.progressPercent} {...register('progressPercent')} />
        {errors.progressPercent && <p className="mt-1 text-caption text-destructive-600">{errors.progressPercent.message}</p>}
      </div>
      <Button type="submit" loading={create.isPending}>Submit Progress</Button>
      {create.isError && <p className="text-caption text-destructive-600">Failed to submit progress.</p>}
    </form>
  );
}
