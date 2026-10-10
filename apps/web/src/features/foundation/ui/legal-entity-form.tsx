import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { createLegalEntitySchema, type LegalEntity } from '@aec/api-contracts';
import { z } from 'zod';
import { Button, Input, Label } from '@aec/ui';
import { useCreateLegalEntity, useUpdateLegalEntity } from '@/entities/legal-entity';
import { useCurrencies } from '@/features/foundation-hardening';

const formSchema = z.object({
  code: createLegalEntitySchema.shape.code,
  legalName: createLegalEntitySchema.shape.legalName,
  taxIdentifier: createLegalEntitySchema.shape.taxIdentifier,
  country: createLegalEntitySchema.shape.country,
  functionalCurrency: z.string().length(3),
  reportingCurrency: z.string().length(3),
  fiscalCalendar: z.string().min(1).max(20),
});
type LegalEntityFormValues = z.infer<typeof formSchema>;

export interface LegalEntityFormProps {
  mode: 'create' | 'edit';
  entity?: LegalEntity;
  onDone: () => void;
}

/**
 * Form tambah/edit legal entity. Semua field ditampilkan — termasuk mata uang
 * dan kalender fiskal yang sebelumnya hilang dari JSX. Validasi `onBlur` lalu
 * `onChange` setelah error (mengurangi gangguan saat mengetik).
 */
export function LegalEntityForm({ mode, entity, onDone }: LegalEntityFormProps) {
  const create = useCreateLegalEntity();
  const update = useUpdateLegalEntity(entity?.id ?? '');
  const currencies = useCurrencies();

  const { register, handleSubmit, formState: { errors } } = useForm<LegalEntityFormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      code: entity?.code ?? '',
      legalName: entity?.legalName ?? '',
      taxIdentifier: entity?.taxIdentifier ?? '',
      country: entity?.country ?? '',
      functionalCurrency: entity?.functionalCurrency ?? 'IDR',
      reportingCurrency: entity?.reportingCurrency ?? 'IDR',
      fiscalCalendar: entity?.fiscalCalendar ?? 'STANDARD',
    },
  });

  const pending = mode === 'create' ? create.isPending : update.isPending;
  const isError = mode === 'create' ? create.isError : update.isError;

  const onSubmit = handleSubmit((input) => {
    if (mode === 'create') create.mutate(input, { onSuccess: onDone });
    else update.mutate(input, { onSuccess: onDone });
  });

  const currencyOptions = currencies.data?.items ?? [];

  return (
    <form onSubmit={onSubmit} className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="code">Code</Label>
          <Input id="code" placeholder="AEC-EPC" error={!!errors.code} {...register('code')} />
          {errors.code && <p className="mt-1 text-caption text-destructive-600">{errors.code.message}</p>}
        </div>
        <div>
          <Label htmlFor="legalName">Legal name</Label>
          <Input id="legalName" placeholder="PT AEC EPC" error={!!errors.legalName} {...register('legalName')} />
          {errors.legalName && <p className="mt-1 text-caption text-destructive-600">{errors.legalName.message}</p>}
        </div>
        <div>
          <Label htmlFor="taxIdentifier">Tax ID</Label>
          <Input id="taxIdentifier" placeholder="00.000.000.0-000.000" error={!!errors.taxIdentifier} {...register('taxIdentifier')} />
          {errors.taxIdentifier && <p className="mt-1 text-caption text-destructive-600">{errors.taxIdentifier.message}</p>}
        </div>
        <div>
          <Label htmlFor="country">Country</Label>
          <Input id="country" placeholder="ID" maxLength={2} error={!!errors.country} {...register('country')} />
          {errors.country && <p className="mt-1 text-caption text-destructive-600">{errors.country.message}</p>}
        </div>
        <div>
          <Label htmlFor="functionalCurrency">Functional currency</Label>
          <Input id="functionalCurrency" list="currency-codes" placeholder="IDR" maxLength={3} error={!!errors.functionalCurrency} {...register('functionalCurrency')} />
          <datalist id="currency-codes">
            {currencyOptions.map((c) => (
              <option key={c.code} value={c.code} />
            ))}
          </datalist>
          {errors.functionalCurrency && <p className="mt-1 text-caption text-destructive-600">{errors.functionalCurrency.message}</p>}
        </div>
        <div>
          <Label htmlFor="reportingCurrency">Reporting currency</Label>
          <Input id="reportingCurrency" list="currency-codes" placeholder="IDR" maxLength={3} error={!!errors.reportingCurrency} {...register('reportingCurrency')} />
          {errors.reportingCurrency && <p className="mt-1 text-caption text-destructive-600">{errors.reportingCurrency.message}</p>}
        </div>
        <div>
          <Label htmlFor="fiscalCalendar">Fiscal calendar</Label>
          <Input id="fiscalCalendar" placeholder="STANDARD" error={!!errors.fiscalCalendar} {...register('fiscalCalendar')} />
          {errors.fiscalCalendar && <p className="mt-1 text-caption text-destructive-600">{errors.fiscalCalendar.message}</p>}
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" loading={pending}>{mode === 'create' ? 'Save' : 'Save changes'}</Button>
      </div>
      {isError && <p className="mt-2 text-caption text-destructive-600">Failed to save the entity. Check the code and tax ID.</p>}
    </form>
  );
}
