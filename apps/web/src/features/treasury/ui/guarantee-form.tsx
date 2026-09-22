import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { createBankGuaranteeSchema } from '@aec/api-contracts';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useCreateBankGuarantee } from '../model/treasury.api';
import { useLegalEntities } from '@/entities/legal-entity';
import { useProjects } from '@/entities/project';

const formSchema = z.object({
  legalEntityId: z.string().min(1, 'Entity wajib dipilih'),
  projectId: z.string(),
  guaranteeType: z.enum(['BID', 'PERFORMANCE', 'ADVANCE', 'RETENTION', 'MAINTENANCE']),
  beneficiary: createBankGuaranteeSchema.shape.beneficiary,
  bankName: createBankGuaranteeSchema.shape.bankName,
  amount: z.string().refine((v) => v.trim() !== '' && !isNaN(Number(v)), 'Nilai wajib diisi'),
});
type FormValues = z.infer<typeof formSchema>;

export function GuaranteeForm() {
  const { data: entities } = useLegalEntities({ page: 1, pageSize: 100 });
  const { data: projects } = useProjects({ page: 1, pageSize: 100 });
  const create = useCreateBankGuarantee();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { legalEntityId: '', projectId: '', guaranteeType: 'PERFORMANCE', beneficiary: '', bankName: '', amount: '' },
  });

  const onSubmit = handleSubmit((input) =>
    create.mutate(
      { legalEntityId: input.legalEntityId, projectId: input.projectId || undefined, guaranteeType: input.guaranteeType, beneficiary: input.beneficiary, bankName: input.bankName, amount: Number(input.amount) },
      { onSuccess: () => { reset(); } },
    )
  );

  return (
    <form onSubmit={onSubmit} className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="bg-entity">Entity <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Controller name="legalEntityId" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="bg-entity"><SelectValue placeholder="Pilih…" /></SelectTrigger>
              <SelectContent>
                {(entities?.items ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.code}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
          {errors.legalEntityId && <p className="mt-1 text-caption text-destructive-600">{errors.legalEntityId.message}</p>}
        </div>
        <div>
          <Label htmlFor="bg-project">Project</Label>
          <Controller name="projectId" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="bg-project"><SelectValue placeholder="Pilih…" /></SelectTrigger>
              <SelectContent>
                {(projects?.items ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </div>
        <div>
          <Label htmlFor="bg-type">Tipe</Label>
          <Controller name="guaranteeType" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="bg-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['BID', 'PERFORMANCE', 'ADVANCE', 'RETENTION', 'MAINTENANCE'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </div>
        <div className="flex-1">
          <Label htmlFor="bg-benef">Beneficiary <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="bg-benef" error={!!errors.beneficiary} {...register('beneficiary')} />
          {errors.beneficiary && <p className="mt-1 text-caption text-destructive-600">{errors.beneficiary.message}</p>}
        </div>
        <div>
          <Label htmlFor="bg-bank">Bank <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="bg-bank" error={!!errors.bankName} {...register('bankName')} />
          {errors.bankName && <p className="mt-1 text-caption text-destructive-600">{errors.bankName.message}</p>}
        </div>
        <div>
          <Label htmlFor="bg-amt">Nilai <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="bg-amt" type="number" min={0} className="w-32" error={!!errors.amount} {...register('amount')} />
          {errors.amount && <p className="mt-1 text-caption text-destructive-600">{errors.amount.message}</p>}
        </div>
        <Button type="submit" loading={create.isPending}>Buat BG</Button>
      </div>
    </form>
  );
}
