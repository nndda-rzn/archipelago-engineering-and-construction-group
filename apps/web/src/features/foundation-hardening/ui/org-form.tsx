import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { createOrganizationSchema, type Organization } from '@aec/api-contracts';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useCreateOrganization, useUpdateOrganization } from '../model/foundation-hardening.api';
import { useLegalEntities } from '@/entities/legal-entity';

const formSchema = z.object({
  legalEntityId: z.string().min(1, 'Entity is required'),
  name: createOrganizationSchema.shape.name,
  orgType: createOrganizationSchema.shape.orgType,
  parentId: z.string().optional(),
  effectiveFrom: z.string().optional(),
  effectiveTo: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

const ORG_TYPES = ['GROUP', 'LEGAL_ENTITY', 'BUSINESS_UNIT', 'DIVISION', 'REGION', 'BRANCH', 'DEPARTMENT', 'SECTION'];

export interface OrgFormProps {
  /** Unit yang sedang diedit; absen = mode buat. */
  editing?: Organization | null;
  /** Kandidat parent (unit lain pada entity yang sama). */
  parentOptions?: Array<{ id: string; name: string }>;
  onDone?: () => void;
}

/**
 * Form buat/edit unit organisasi. Menyertakan pemilih **parent** supaya hierarki
 * bisa dibangun (sebelumnya tak ada, sehingga struktur selalu datar) dan tanggal
 * efektif supaya perubahan bisa dijadwalkan.
 */
export function OrgForm({ editing, parentOptions = [], onDone }: OrgFormProps) {
  const { data: entities } = useLegalEntities({ page: 1, pageSize: 100 });
  const create = useCreateOrganization();
  const update = useUpdateOrganization();
  const pending = editing ? update.isPending : create.isPending;
  const isError = editing ? update.isError : create.isError;

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      legalEntityId: editing?.legalEntityId ?? '',
      name: editing?.name ?? '',
      orgType: (editing?.orgType as FormValues['orgType']) ?? 'BUSINESS_UNIT',
      parentId: editing?.parentId ?? '',
      effectiveFrom: editing?.effectiveFrom?.slice(0, 10) ?? '',
      effectiveTo: editing?.effectiveTo?.slice(0, 10) ?? '',
    },
  });

  const onSubmit = handleSubmit((input) => {
    const payload = {
      name: input.name,
      orgType: input.orgType,
      parentId: input.parentId || undefined,
      effectiveFrom: input.effectiveFrom || undefined,
      effectiveTo: input.effectiveTo || undefined,
    };
    if (editing) {
      update.mutate({ id: editing.id, ...payload }, { onSuccess: () => { reset(); onDone?.(); } });
    } else {
      create.mutate({ legalEntityId: input.legalEntityId, ...payload }, { onSuccess: () => { reset(); onDone?.(); } });
    }
  });

  return (
    <form onSubmit={onSubmit} className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {!editing && (
          <div>
            <Label htmlFor="orgf-entity">Entity <span aria-hidden="true" className="text-destructive-600">*</span></Label>
            <Controller name="legalEntityId" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="orgf-entity"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {(entities?.items ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.code}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
            {errors.legalEntityId && <p className="mt-1 text-caption text-destructive-600">{errors.legalEntityId.message}</p>}
          </div>
        )}
        <div>
          <Label htmlFor="orgf-name">Name <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="orgf-name" error={!!errors.name} {...register('name')} />
          {errors.name && <p className="mt-1 text-caption text-destructive-600">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="orgf-type">Type</Label>
          <Controller name="orgType" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="orgf-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ORG_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </div>
        <div>
          <Label htmlFor="orgf-parent">Parent unit</Label>
          <Controller name="parentId" control={control} render={({ field }) => (
            <Select value={field.value || '__none'} onValueChange={(v) => field.onChange(v === '__none' ? '' : v)}>
              <SelectTrigger id="orgf-parent"><SelectValue placeholder="No parent (root)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">No parent (root)</SelectItem>
                {parentOptions.filter((p) => p.id !== editing?.id).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </div>
        <div>
          <Label htmlFor="orgf-from">Effective from</Label>
          <Input id="orgf-from" type="date" {...register('effectiveFrom')} />
        </div>
        <div>
          <Label htmlFor="orgf-to">Effective to</Label>
          <Input id="orgf-to" type="date" {...register('effectiveTo')} />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        {onDone && <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>}
        <Button type="submit" loading={pending}>{editing ? 'Save changes' : 'Create'}</Button>
      </div>
      {isError && <p className="mt-2 text-caption text-destructive-600" role="alert">Failed to save. Check the data again.</p>}
    </form>
  );
}
