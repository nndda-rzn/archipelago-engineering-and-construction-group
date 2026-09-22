import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { createPaymentProposalSchema } from '@aec/api-contracts';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useBankAccounts, useCreatePaymentProposal } from '../model/treasury.api';
import { useLegalEntities } from '@/entities/legal-entity';

const formSchema = z.object({
  legalEntityId: z.string().min(1, 'Entity wajib dipilih'),
  bankAccountId: z.string(),
  vendor: createPaymentProposalSchema.shape.vendor,
  totalAmount: z.string().refine((v) => v.trim() !== '' && !isNaN(Number(v)), 'Nilai wajib diisi'),
});
type FormValues = z.infer<typeof formSchema>;

export function ProposalForm() {
  const { data: entities } = useLegalEntities({ page: 1, pageSize: 100 });
  const { data: banks } = useBankAccounts({ page: 1, pageSize: 100 });
  const create = useCreatePaymentProposal();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { legalEntityId: '', bankAccountId: '', vendor: '', totalAmount: '' },
  });

  const onSubmit = handleSubmit((input) =>
    create.mutate(
      { legalEntityId: input.legalEntityId, vendor: input.vendor, totalAmount: Number(input.totalAmount), bankAccountId: input.bankAccountId || undefined },
      { onSuccess: () => { reset(); } },
    )
  );

  return (
    <form onSubmit={onSubmit} className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="pp-entity">Entity <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Controller name="legalEntityId" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="pp-entity"><SelectValue placeholder="Pilih…" /></SelectTrigger>
              <SelectContent>
                {(entities?.items ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.code}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
          {errors.legalEntityId && <p className="mt-1 text-caption text-destructive-600">{errors.legalEntityId.message}</p>}
        </div>
        <div>
          <Label htmlFor="pp-bank">Rekening</Label>
          <Controller name="bankAccountId" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="pp-bank"><SelectValue placeholder="Pilih…" /></SelectTrigger>
              <SelectContent>
                {(banks?.items ?? []).map((b) => <SelectItem key={b.id} value={b.id}>{b.bankName} {b.accountNumber}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </div>
        <div className="flex-1">
          <Label htmlFor="pp-vendor">Vendor <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="pp-vendor" error={!!errors.vendor} {...register('vendor')} />
          {errors.vendor && <p className="mt-1 text-caption text-destructive-600">{errors.vendor.message}</p>}
        </div>
        <div>
          <Label htmlFor="pp-amt">Nilai <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="pp-amt" type="number" min={0} className="w-36" error={!!errors.totalAmount} {...register('totalAmount')} />
          {errors.totalAmount && <p className="mt-1 text-caption text-destructive-600">{errors.totalAmount.message}</p>}
        </div>
        <Button type="submit" loading={create.isPending}>Buat Proposal</Button>
      </div>
    </form>
  );
}
