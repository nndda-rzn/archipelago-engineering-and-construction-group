import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createLegalEntitySchema } from '@aec/api-contracts';
import { z } from 'zod';

type CreateLegalEntityForm = {
  code: string;
  legalName: string;
  taxIdentifier: string;
  country: string;
  functionalCurrency: string;
  reportingCurrency: string;
};

const formSchema = z.object({
  code: createLegalEntitySchema.shape.code,
  legalName: createLegalEntitySchema.shape.legalName,
  taxIdentifier: createLegalEntitySchema.shape.taxIdentifier,
  country: createLegalEntitySchema.shape.country,
  functionalCurrency: z.string().length(3),
  reportingCurrency: z.string().length(3),
});
import { Button, Input, Label, Badge } from '@aec/ui';
import { useCreateLegalEntity, useLegalEntities } from './legal-entity.api';

const statusVariant: Record<string, 'success' | 'warning' | 'muted' | 'default'> = {
  ACTIVE: 'success',
  BLOCKED: 'warning',
  INACTIVE: 'muted',
  ARCHIVED: 'muted',
};

export function LegalEntityListPage() {
  const { data, isLoading, isError, refetch } = useLegalEntities();
  const create = useCreateLegalEntity();
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateLegalEntityForm>({
    resolver: zodResolver(formSchema),
    defaultValues: { functionalCurrency: 'IDR', reportingCurrency: 'IDR' },
  });

  const onSubmit = handleSubmit((input) => {
    create.mutate(input, {
      onSuccess: () => {
        reset();
        setShowForm(false);
      },
    });
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Legal Entities</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Badan hukum perusahaan (FR-FND-001)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Tutup' : '+ Tambah Entity'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code">Kode</Label>
              <Input id="code" placeholder="AEC-EPC" error={!!errors.code} {...register('code')} />
              {errors.code && <p className="mt-1 text-caption text-destructive-600">{errors.code.message}</p>}
            </div>
            <div>
              <Label htmlFor="legalName">Nama Legal</Label>
              <Input id="legalName" placeholder="PT AEC EPC" error={!!errors.legalName} {...register('legalName')} />
              {errors.legalName && <p className="mt-1 text-caption text-destructive-600">{errors.legalName.message}</p>}
            </div>
            <div>
              <Label htmlFor="taxIdentifier">NPWP</Label>
              <Input id="taxIdentifier" placeholder="00.000.000.0-000.000" error={!!errors.taxIdentifier} {...register('taxIdentifier')} />
              {errors.taxIdentifier && <p className="mt-1 text-caption text-destructive-600">{errors.taxIdentifier.message}</p>}
            </div>
            <div>
              <Label htmlFor="country">Negara</Label>
              <Input id="country" placeholder="ID" maxLength={2} error={!!errors.country} {...register('country')} />
              {errors.country && <p className="mt-1 text-caption text-destructive-600">{errors.country.message}</p>}
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Batal</Button>
            <Button type="submit" loading={create.isPending}>Simpan</Button>
          </div>
          {create.isError && (
            <p className="mt-2 text-caption text-destructive-600">Gagal membuat entity. Periksa kode/NPWP.</p>
          )}
        </form>
      )}

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        {isLoading && <p className="p-6 text-body-sm text-neutral-500">Memuat…</p>}
        {isError && (
          <div className="p-6 text-body-sm text-destructive-600">
            Gagal memuat data.{' '}
            <button type="button" className="text-racing-red-600 hover:underline" onClick={() => refetch()}>Coba lagi</button>
          </div>
        )}
        {data && (
          <table className="w-full border-collapse text-left text-body-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-caption uppercase text-neutral-500">
                <th className="px-4 py-2 font-medium">Kode</th>
                <th className="px-4 py-2 font-medium">Nama Legal</th>
                <th className="px-4 py-2 font-medium">NPWP</th>
                <th className="px-4 py-2 font-medium">Negara</th>
                <th className="px-4 py-2 font-medium">Mata Uang</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((entity) => (
                <tr key={entity.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                  <td className="px-4 py-2.5 font-mono text-neutral-800">{entity.code}</td>
                  <td className="px-4 py-2.5 text-neutral-900">{entity.legalName}</td>
                  <td className="px-4 py-2.5 font-mono text-neutral-600">{entity.taxIdentifier}</td>
                  <td className="px-4 py-2.5 text-neutral-600">{entity.country}</td>
                  <td className="px-4 py-2.5 font-mono text-neutral-600">{entity.functionalCurrency}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant={statusVariant[entity.status] ?? 'default'}>{entity.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
