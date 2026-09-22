import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { createFxExposureSchema } from '@aec/api-contracts';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useCreateFxExposure } from '../model/treasury.api';
import { useLegalEntities } from '@/entities/legal-entity';

const formSchema = z.object({
  legalEntityId: z.string().min(1, 'Entity wajib dipilih'),
  currency: createFxExposureSchema.shape.currency,
  exposureAmount: z.string().refine((v) => v.trim() !== '' && !isNaN(Number(v)), 'Eksposur wajib diisi'),
  rate: z.string(),
});
type FormValues = z.infer<typeof formSchema>;

export function FxForm() {
  const { data: entities } = useLegalEntities({ page: 1, pageSize: 100 });
  const create = useCreateFxExposure();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { legalEntityId: '', currency: 'USD', exposureAmount: '', rate: '' },
  });

  const onSubmit = handleSubmit((input) =>
    create.mutate(
      { legalEntityId: input.legalEntityId, currency: input.currency, exposureAmount: Number(input.exposureAmount), rate: input.rate ? Number(input.rate) : undefined },
      { onSuccess: () => { reset(); } },
    )
  );

  return (
    <form onSubmit={onSubmit} className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="fx-entity">Entity <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Controller name="legalEntityId" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="fx-entity"><SelectValue placeholder="Pilih…" /></SelectTrigger>
              <SelectContent>
                {(entities?.items ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.code}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
          {errors.legalEntityId && <p className="mt-1 text-caption text-destructive-600">{errors.legalEntityId.message}</p>}
        </div>
        <div>
          <Label htmlFor="fx-ccy">Mata Uang <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Controller name="currency" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="fx-ccy"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['USD', 'EUR', 'SGD', 'JPY', 'GBP', 'CNY'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </div>
        <div>
          <Label htmlFor="fx-amt">Eksposur <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="fx-amt" type="number" min={0} className="w-36" error={!!errors.exposureAmount} {...register('exposureAmount')} />
          {errors.exposureAmount && <p className="mt-1 text-caption text-destructive-600">{errors.exposureAmount.message}</p>}
        </div>
        <div>
          <Label htmlFor="fx-rate">Rate</Label>
          <Input id="fx-rate" type="number" step="0.000001" min={0} placeholder="16000" className="w-32" {...register('rate')} />
        </div>
        <Button type="submit" loading={create.isPending}>Buat FX</Button>
      </div>
    </form>
  );
}
