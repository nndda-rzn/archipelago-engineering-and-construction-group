import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { createLegalEntitySchema } from '@aec/api-contracts';
import { z } from 'zod';
import { Button, Input, Label } from '@aec/ui';
import { useCreateLegalEntity } from '@/entities/legal-entity';

const formSchema = z.object({
  code: createLegalEntitySchema.shape.code,
  legalName: createLegalEntitySchema.shape.legalName,
  taxIdentifier: createLegalEntitySchema.shape.taxIdentifier,
  country: createLegalEntitySchema.shape.country,
  functionalCurrency: z.string().length(3),
  reportingCurrency: z.string().length(3),
});
type LegalEntityFormValues = z.infer<typeof formSchema>;

export function LegalEntityForm({ onDone }: { onDone: () => void }) {
  const create = useCreateLegalEntity();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<LegalEntityFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { functionalCurrency: 'IDR', reportingCurrency: 'IDR' },
  });
  const onSubmit = handleSubmit((input) => create.mutate(input, { onSuccess: () => { reset(); onDone(); } }));

  return (
    <form onSubmit={onSubmit} className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-2 gap-4">
        <div><Label htmlFor="code">Kode</Label><Input id="code" placeholder="AEC-EPC" error={!!errors.code} {...register('code')} />{errors.code && <p className="mt-1 text-caption text-destructive-600">{errors.code.message}</p>}</div>
        <div><Label htmlFor="legalName">Nama Legal</Label><Input id="legalName" placeholder="PT AEC EPC" error={!!errors.legalName} {...register('legalName')} />{errors.legalName && <p className="mt-1 text-caption text-destructive-600">{errors.legalName.message}</p>}</div>
        <div><Label htmlFor="taxIdentifier">NPWP</Label><Input id="taxIdentifier" placeholder="00.000.000.0-000.000" error={!!errors.taxIdentifier} {...register('taxIdentifier')} />{errors.taxIdentifier && <p className="mt-1 text-caption text-destructive-600">{errors.taxIdentifier.message}</p>}</div>
        <div><Label htmlFor="country">Negara</Label><Input id="country" placeholder="ID" maxLength={2} error={!!errors.country} {...register('country')} />{errors.country && <p className="mt-1 text-caption text-destructive-600">{errors.country.message}</p>}</div>
      </div>
      <div className="mt-4 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onDone}>Batal</Button><Button type="submit" loading={create.isPending}>Simpan</Button></div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal membuat entity. Periksa kode/NPWP.</p>}
    </form>
  );
}
