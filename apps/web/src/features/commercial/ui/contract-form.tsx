import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { createContractSchema } from '@aec/api-contracts';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useClients, useCreateContract } from '../model/commercial.api';
import { useProjects } from '@/entities/project';

const formSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  projectId: z.string(),
  title: createContractSchema.shape.title,
  value: z.string().refine((v) => Number(v) > 0, 'Value is required'),
  contractType: z.enum(['LUMP_SUM', 'UNIT_PRICE', 'COST_PLUS', 'TIME_MATERIAL']),
  retentionTerm: z.string(),
});
type FormValues = z.infer<typeof formSchema>;

export function ContractForm({ onDone }: { onDone: () => void }) {
  const { data: clients } = useClients({ page: 1, pageSize: 100 });
  const { data: projects } = useProjects({ page: 1, pageSize: 100 });
  const create = useCreateContract();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { clientId: '', projectId: '', title: '', value: '', contractType: 'LUMP_SUM', retentionTerm: '5' },
  });

  const onSubmit = handleSubmit((input) =>
    create.mutate(
      {
        clientId: input.clientId,
        projectId: input.projectId || undefined,
        title: input.title,
        value: Number(input.value),
        contractType: input.contractType,
        retentionTerm: Number(input.retentionTerm),
      },
      { onSuccess: () => { reset(); onDone(); } },
    )
  );

  return (
    <form onSubmit={onSubmit} className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="ctr-client">Client <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Controller name="clientId" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="ctr-client">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {(clients?.items ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
          {errors.clientId && <p className="mt-1 text-caption text-destructive-600">{errors.clientId.message}</p>}
        </div>
        <div>
          <Label htmlFor="ctr-project">Project (optional)</Label>
          <Controller name="projectId" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="ctr-project">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {(projects?.items ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </div>
        <div className="flex-1">
          <Label htmlFor="ctr-title">Contract Title <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="ctr-title" error={!!errors.title} {...register('title')} />
          {errors.title && <p className="mt-1 text-caption text-destructive-600">{errors.title.message}</p>}
        </div>
        <div>
          <Label htmlFor="ctr-type">Type</Label>
          <Controller name="contractType" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="ctr-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LUMP_SUM">LUMP_SUM</SelectItem>
                <SelectItem value="UNIT_PRICE">UNIT_PRICE</SelectItem>
                <SelectItem value="COST_PLUS">COST_PLUS</SelectItem>
                <SelectItem value="TIME_MATERIAL">TIME_MATERIAL</SelectItem>
              </SelectContent>
            </Select>
          )} />
        </div>
        <div>
          <Label htmlFor="ctr-value">Value <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="ctr-value" type="number" min={0} error={!!errors.value} {...register('value')} />
          {errors.value && <p className="mt-1 text-caption text-destructive-600">{errors.value.message}</p>}
        </div>
        <div>
          <Label htmlFor="ctr-ret">Retention %</Label>
          <Input id="ctr-ret" type="number" min={0} max={100} className="w-16" {...register('retentionTerm')} />
        </div>
        <Button type="submit" loading={create.isPending}>Create Contract</Button>
      </div>
    </form>
  );
}
