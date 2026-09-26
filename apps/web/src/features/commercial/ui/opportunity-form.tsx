import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { createOpportunitySchema } from '@aec/api-contracts';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useClients, useCreateOpportunity } from '../model/commercial.api';

const formSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  title: createOpportunitySchema.shape.title,
  expectedValue: z.string().refine((v) => v.trim() !== '' && !isNaN(Number(v)), 'Value is required'),
  owner: createOpportunitySchema.shape.owner,
});
type FormValues = z.infer<typeof formSchema>;

export function OpportunityForm({ onDone }: { onDone: () => void }) {
  const { data: clients } = useClients({ page: 1, pageSize: 100 });
  const create = useCreateOpportunity();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { clientId: '', title: '', expectedValue: '', owner: '' },
  });

  const onSubmit = handleSubmit((input) =>
    create.mutate(
      { clientId: input.clientId, title: input.title, expectedValue: Number(input.expectedValue), owner: input.owner },
      { onSuccess: () => { reset(); onDone(); } },
    )
  );

  return (
    <form onSubmit={onSubmit} className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="opp-client">Client <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Controller name="clientId" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="opp-client">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {(clients?.items ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
          {errors.clientId && <p className="mt-1 text-caption text-destructive-600">{errors.clientId.message}</p>}
        </div>
        <div className="flex-1">
          <Label htmlFor="opp-title">Title <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="opp-title" error={!!errors.title} {...register('title')} />
          {errors.title && <p className="mt-1 text-caption text-destructive-600">{errors.title.message}</p>}
        </div>
        <div>
          <Label htmlFor="opp-value">Value <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="opp-value" type="number" min={0} error={!!errors.expectedValue} {...register('expectedValue')} />
          {errors.expectedValue && <p className="mt-1 text-caption text-destructive-600">{errors.expectedValue.message}</p>}
        </div>
        <div>
          <Label htmlFor="opp-owner">Owner <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="opp-owner" error={!!errors.owner} {...register('owner')} />
          {errors.owner && <p className="mt-1 text-caption text-destructive-600">{errors.owner.message}</p>}
        </div>
        <Button type="submit" loading={create.isPending}>Create Opportunity</Button>
      </div>
    </form>
  );
}
