import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { createCashForecastSchema } from '@aec/api-contracts';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useCreateCashForecast } from '../model/treasury.api';
import { useLegalEntities } from '@/entities/legal-entity';

const formSchema = z.object({
  legalEntityId: z.string().min(1, 'Entity is required'),
  period: createCashForecastSchema.shape.period,
  receipt: z.string(),
  ap: z.string(),
  payroll: z.string(),
});
type FormValues = z.infer<typeof formSchema>;

export function ForecastForm() {
  const { data: entities } = useLegalEntities({ page: 1, pageSize: 100 });
  const create = useCreateCashForecast();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { legalEntityId: '', period: '', receipt: '', ap: '', payroll: '' },
  });

  const onSubmit = handleSubmit((input) =>
    create.mutate(
      { legalEntityId: input.legalEntityId, period: input.period, expectedReceipt: input.receipt ? Number(input.receipt) : undefined, expectedAp: input.ap ? Number(input.ap) : undefined, expectedPayroll: input.payroll ? Number(input.payroll) : undefined },
      { onSuccess: () => { reset(); } },
    )
  );

  return (
    <form onSubmit={onSubmit} className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="cf-entity">Entity <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Controller name="legalEntityId" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="cf-entity"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {(entities?.items ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.code}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
          {errors.legalEntityId && <p className="mt-1 text-caption text-destructive-600">{errors.legalEntityId.message}</p>}
        </div>
        <div>
          <Label htmlFor="cf-period">Period <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="cf-period" placeholder="2026-09" error={!!errors.period} {...register('period')} />
          {errors.period && <p className="mt-1 text-caption text-destructive-600">{errors.period.message}</p>}
        </div>
        <div>
          <Label htmlFor="cf-receipt">Receipt</Label>
          <Input id="cf-receipt" type="number" min={0} className="w-32" {...register('receipt')} />
        </div>
        <div>
          <Label htmlFor="cf-ap">AP</Label>
          <Input id="cf-ap" type="number" min={0} className="w-32" {...register('ap')} />
        </div>
        <div>
          <Label htmlFor="cf-payroll">Payroll</Label>
          <Input id="cf-payroll" type="number" min={0} className="w-32" {...register('payroll')} />
        </div>
        <Button type="submit" loading={create.isPending}>Create Forecast</Button>
      </div>
    </form>
  );
}
