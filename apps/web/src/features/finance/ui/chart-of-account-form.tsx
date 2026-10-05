import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { createChartOfAccountSchema } from '@aec/api-contracts';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useCreateChartOfAccount } from '../model/chart-of-account.api';
import { useChartOfAccounts } from '../model/chart-of-account.api';

const formSchema = z.object({
  code: createChartOfAccountSchema.shape.code,
  name: createChartOfAccountSchema.shape.name,
  accountType: z.string(),
  normalBalance: z.string(),
  description: createChartOfAccountSchema.shape.description,
});
type FormValues = z.infer<typeof formSchema>;

export function CoaForm({ onDone, entityId }: { onDone: () => void; entityId: string }) {
  const create = useCreateChartOfAccount();
  const { data: accounts } = useChartOfAccounts({ legalEntityId: entityId });
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { code: '', name: '', accountType: 'ASSET', normalBalance: 'DEBIT', description: '' },
  });

  const onSubmit = handleSubmit((input) =>
    create.mutate(
      { legalEntityId: entityId, code: input.code, name: input.name, accountType: input.accountType, normalBalance: input.normalBalance, description: input.description || undefined },
      { onSuccess: () => { reset(); onDone(); } },
    )
  );

  return (
    <form onSubmit={onSubmit} className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="coa-code">Code <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="coa-code" placeholder="e.g. 1300" error={!!errors.code} {...register('code')} />
          {errors.code && <p className="mt-1 text-caption text-destructive-600">{errors.code.message}</p>}
        </div>
        <div>
          <Label htmlFor="coa-name">Name <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="coa-name" placeholder="e.g. Fixed Assets" error={!!errors.name} {...register('name')} />
          {errors.name && <p className="mt-1 text-caption text-destructive-600">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="coa-type">Account Type</Label>
          <Controller name="accountType" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="coa-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ASSET">Asset</SelectItem>
                <SelectItem value="LIABILITY">Liability</SelectItem>
                <SelectItem value="EQUITY">Equity</SelectItem>
                <SelectItem value="REVENUE">Revenue</SelectItem>
                <SelectItem value="EXPENSE">Expense</SelectItem>
              </SelectContent>
            </Select>
          )} />
        </div>
        <div>
          <Label htmlFor="coa-balance">Normal Balance</Label>
          <Controller name="normalBalance" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="coa-balance"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DEBIT">Debit</SelectItem>
                <SelectItem value="CREDIT">Credit</SelectItem>
              </SelectContent>
            </Select>
          )} />
        </div>
        <div className="col-span-2">
          <Label htmlFor="coa-desc">Description (optional)</Label>
          <Input id="coa-desc" placeholder="Account note" error={!!errors.description} {...register('description')} />
          {errors.description && <p className="mt-1 text-caption text-destructive-600">{errors.description.message}</p>}
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onDone}>Cancel</Button><Button type="submit" loading={create.isPending}>Save Account</Button></div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Account code already exists / invalid data.</p>}
      {accounts && accounts.length > 0 && <p className="mt-3 text-caption text-neutral-500">{accounts.length} account(s) registered · code format: 1xxx Asset, 2xxx Liability, 3xxx Equity, 4xxx Revenue, 6xxx Expense.</p>}
    </form>
  );
}
