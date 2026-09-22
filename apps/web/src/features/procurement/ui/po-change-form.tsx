import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { createPoChangeSchema } from '@aec/api-contracts';
import { Button, Input, Label } from '@aec/ui';
import { useCreatePoChange } from '@/features/procurement';

const formSchema = z.object({
  newTotal: z.string().refine((v) => v.trim() !== '' && !isNaN(Number(v)) && Number(v) !== 0, 'Total baru wajib diisi'),
  reason: createPoChangeSchema.shape.reason,
});
type FormValues = z.infer<typeof formSchema>;

export function PoChangeForm({ poId }: { poId: string }) {
  const create = useCreatePoChange(poId);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { newTotal: '', reason: '' },
  });

  const onSubmit = handleSubmit((input) =>
    create.mutate(
      { newTotal: Number(input.newTotal), reason: input.reason },
      { onSuccess: () => reset() },
    )
  );

  return (
    <form onSubmit={onSubmit} className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <h3 className="mb-3 text-h3 text-neutral-900">Ajukan PO Change</h3>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="pc-total">Total Baru (IDR) <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="pc-total" type="number" placeholder="0" className="w-48" error={!!errors.newTotal} {...register('newTotal')} />
          {errors.newTotal && <p className="mt-1 text-caption text-destructive-600">{errors.newTotal.message}</p>}
        </div>
        <div className="flex-1">
          <Label htmlFor="pc-reason">Alasan <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="pc-reason" error={!!errors.reason} {...register('reason')} />
          {errors.reason && <p className="mt-1 text-caption text-destructive-600">{errors.reason.message}</p>}
        </div>
        <Button type="submit" loading={create.isPending}>Ajukan</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal mengajukan PO Change.</p>}
    </form>
  );
}
