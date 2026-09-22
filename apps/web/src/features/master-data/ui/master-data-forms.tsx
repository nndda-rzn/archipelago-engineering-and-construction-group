import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { createVendorSchema, createFiscalPeriodSchema } from '@aec/api-contracts';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useCreateFiscalPeriod, useCreateVendor } from '../model/master-data.api';

const vendorSchema = z.object({
  name: createVendorSchema.shape.name,
  taxId: createVendorSchema.shape.taxId,
  category: createVendorSchema.shape.category,
});
type VendorValues = z.infer<typeof vendorSchema>;

export function VendorForm({ onDone }: { onDone: () => void }) {
  const create = useCreateVendor();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<VendorValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: { name: '', taxId: '', category: 'MATERIAL' },
  });
  const onSubmit = handleSubmit((input) =>
    create.mutate({ name: input.name, taxId: input.taxId || undefined, category: input.category }, { onSuccess: () => { reset(); onDone(); } })
  );
  return (
    <form onSubmit={onSubmit} className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="vnd-name">Nama Vendor <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="vnd-name" error={!!errors.name} {...register('name')} />
          {errors.name && <p className="mt-1 text-caption text-destructive-600">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="vnd-tax">NPWP</Label>
          <Input id="vnd-tax" error={!!errors.taxId} {...register('taxId')} />
          {errors.taxId && <p className="mt-1 text-caption text-destructive-600">{errors.taxId.message}</p>}
        </div>
        <div>
          <Label htmlFor="vnd-cat">Kategori</Label>
          <Controller name="category" control={control} render={({ field }) => (
            <Select value={field.value ?? ''} onValueChange={field.onChange}>
              <SelectTrigger id="vnd-cat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['MATERIAL', 'SUBCONTRACTOR', 'SERVICE', 'EQUIPMENT', 'OTHER'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </div>
        <Button type="submit" loading={create.isPending}>Buat Vendor</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600" role="alert">Gagal menyimpan. Periksa kembali data.</p>}
    </form>
  );
}

const periodSchema = z.object({
  periodCode: createFiscalPeriodSchema.shape.periodCode,
  startDate: createFiscalPeriodSchema.shape.startDate,
  endDate: createFiscalPeriodSchema.shape.endDate,
});
type PeriodValues = z.infer<typeof periodSchema>;

export function PeriodForm({ onDone }: { onDone: () => void }) {
  const create = useCreateFiscalPeriod();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<PeriodValues>({
    resolver: zodResolver(periodSchema),
    defaultValues: { periodCode: '', startDate: '', endDate: '' },
  });
  const onSubmit = handleSubmit((input) => {
    const [y, m] = input.periodCode.split('-');
    create.mutate(
      { periodCode: input.periodCode, periodYear: Number(y), periodMonth: Number(m), startDate: input.startDate, endDate: input.endDate },
      { onSuccess: () => { reset(); onDone(); } },
    );
  });
  return (
    <form onSubmit={onSubmit} className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="fp-code">Kode (mis. 2026-09) <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="fp-code" error={!!errors.periodCode} {...register('periodCode')} />
          {errors.periodCode && <p className="mt-1 text-caption text-destructive-600">{errors.periodCode.message}</p>}
        </div>
        <div>
          <Label htmlFor="fp-start">Mulai <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="fp-start" type="date" error={!!errors.startDate} {...register('startDate')} />
          {errors.startDate && <p className="mt-1 text-caption text-destructive-600">{errors.startDate.message}</p>}
        </div>
        <div>
          <Label htmlFor="fp-end">Selesai <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="fp-end" type="date" error={!!errors.endDate} {...register('endDate')} />
          {errors.endDate && <p className="mt-1 text-caption text-destructive-600">{errors.endDate.message}</p>}
        </div>
        <Button type="submit" loading={create.isPending}>Buat Periode</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600" role="alert">Gagal menyimpan. Periksa kembali data.</p>}
    </form>
  );
}
