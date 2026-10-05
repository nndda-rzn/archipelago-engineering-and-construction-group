import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { createBankAccountSchema } from '@aec/api-contracts';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useCreateBankAccount } from '../model/treasury.api';
import { useLegalEntities } from '@/entities/legal-entity';

const formSchema = z.object({
  legalEntityId: z.string().min(1, 'Entity is required'),
  bankCode: createBankAccountSchema.shape.bankCode,
  bankName: createBankAccountSchema.shape.bankName,
  accountNumber: createBankAccountSchema.shape.accountNumber,
  accountName: createBankAccountSchema.shape.accountName,
  currency: z.string(),
  openingBalance: z.string(),
});
type FormValues = z.infer<typeof formSchema>;

export function BankAccountForm() {
  const { data: entities } = useLegalEntities({ page: 1, pageSize: 100 });
  const create = useCreateBankAccount();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { legalEntityId: '', bankCode: '', bankName: '', accountNumber: '', accountName: '', currency: 'IDR', openingBalance: '' },
  });

  const onSubmit = handleSubmit((input) =>
    create.mutate(
      { legalEntityId: input.legalEntityId, bankCode: input.bankCode, bankName: input.bankName, accountNumber: input.accountNumber, accountName: input.accountName, currency: input.currency, openingBalance: input.openingBalance ? Number(input.openingBalance) : undefined },
      { onSuccess: () => { reset(); } },
    )
  );

  return (
    <form onSubmit={onSubmit} className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="ba-entity">Entity <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Controller name="legalEntityId" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="ba-entity"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {(entities?.items ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.code}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
          {errors.legalEntityId && <p className="mt-1 text-caption text-destructive-600">{errors.legalEntityId.message}</p>}
        </div>
        <div>
          <Label htmlFor="ba-code">Bank Code <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="ba-code" placeholder="BCA" error={!!errors.bankCode} {...register('bankCode')} />
          {errors.bankCode && <p className="mt-1 text-caption text-destructive-600">{errors.bankCode.message}</p>}
        </div>
        <div className="flex-1">
          <Label htmlFor="ba-name">Bank Name <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="ba-name" placeholder="Bank Central Asia" error={!!errors.bankName} {...register('bankName')} />
          {errors.bankName && <p className="mt-1 text-caption text-destructive-600">{errors.bankName.message}</p>}
        </div>
        <div>
          <Label htmlFor="ba-num">Account No. <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="ba-num" error={!!errors.accountNumber} {...register('accountNumber')} />
          {errors.accountNumber && <p className="mt-1 text-caption text-destructive-600">{errors.accountNumber.message}</p>}
        </div>
        <div>
          <Label htmlFor="ba-acct">Account Name <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="ba-acct" error={!!errors.accountName} {...register('accountName')} />
          {errors.accountName && <p className="mt-1 text-caption text-destructive-600">{errors.accountName.message}</p>}
        </div>
        <div>
          <Label htmlFor="ba-ccy">Currency</Label>
          <Controller name="currency" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="ba-ccy"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['IDR', 'USD', 'EUR', 'SGD', 'JPY'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </div>
        <div>
          <Label htmlFor="ba-bal">Opening Balance</Label>
          <Input id="ba-bal" type="number" min={0} className="w-32" {...register('openingBalance')} />
        </div>
        <Button type="submit" loading={create.isPending}>Create Account</Button>
      </div>
    </form>
  );
}
