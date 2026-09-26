import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { createOrganizationSchema } from '@aec/api-contracts';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useCreateOrganization } from '../model/foundation-hardening.api';
import { useLegalEntities } from '@/entities/legal-entity';

const formSchema = z.object({
  legalEntityId: z.string().min(1, 'Entity is required'),
  name: createOrganizationSchema.shape.name,
  orgType: createOrganizationSchema.shape.orgType,
});
type FormValues = z.infer<typeof formSchema>;

export function OrgForm() {
  const { data: entities } = useLegalEntities({ page: 1, pageSize: 100 });
  const create = useCreateOrganization();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { legalEntityId: '', name: '', orgType: 'BUSINESS_UNIT' },
  });
  const onSubmit = handleSubmit((input) =>
    create.mutate({ legalEntityId: input.legalEntityId, name: input.name, orgType: input.orgType }, { onSuccess: () => reset() })
  );
  return (
    <form onSubmit={onSubmit} className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="orgf-entity">Entity <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Controller name="legalEntityId" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="orgf-entity">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {(entities?.items ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.code}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
          {errors.legalEntityId && <p className="mt-1 text-caption text-destructive-600">{errors.legalEntityId.message}</p>}
        </div>
        <div className="flex-1">
          <Label htmlFor="orgf-name">Name <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="orgf-name" error={!!errors.name} {...register('name')} />
          {errors.name && <p className="mt-1 text-caption text-destructive-600">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="orgf-type">Type</Label>
          <Controller name="orgType" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="orgf-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['GROUP', 'LEGAL_ENTITY', 'BUSINESS_UNIT', 'DIVISION', 'REGION', 'BRANCH', 'DEPARTMENT', 'SECTION'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </div>
        <Button type="submit" loading={create.isPending}>
          Create
        </Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600" role="alert">Failed to save. Check the data again.</p>}
    </form>
  );
}
