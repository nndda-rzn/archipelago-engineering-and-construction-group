import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { createVendorSchema, createFiscalPeriodSchema, vendorCategorySchema, type Vendor } from '@aec/api-contracts';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useCreateFiscalPeriod, useCreateVendor, useUpdateVendor } from '../model/master-data.api';

const vendorSchema = z.object({
  name: createVendorSchema.shape.name,
  taxId: z.string().max(30).optional(),
  category: vendorCategorySchema,
  contactPerson: z.string().max(200).optional(),
  email: z.union([z.string().email(), z.literal('')]).optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
});
type VendorValues = z.infer<typeof vendorSchema>;

const CATEGORIES = ['MATERIAL', 'SUBCONTRACTOR', 'SERVICE', 'EQUIPMENT', 'OTHER'] as const;

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-caption text-destructive-600">{message}</p> : null;
}

/** Form vendor lengkap (nama, NPWP, kategori, kontak, email, telepon, alamat) — create & edit. */
export function VendorForm({ onDone, editing }: { onDone: () => void; editing?: Vendor | null }) {
  const create = useCreateVendor();
  const update = useUpdateVendor(editing?.id ?? '');
  const isEdit = !!editing;
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<VendorValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: { name: '', taxId: '', category: 'MATERIAL', contactPerson: '', email: '', phone: '', address: '' },
  });

  useEffect(() => {
    reset({
      name: editing?.name ?? '',
      taxId: editing?.taxId ?? '',
      category: (editing?.category as VendorValues['category']) ?? 'MATERIAL',
      contactPerson: editing?.contactPerson ?? '',
      email: editing?.email ?? '',
      phone: editing?.phone ?? '',
      address: editing?.address ?? '',
    });
  }, [editing, reset]);

  const onSubmit = handleSubmit((input) => {
    const payload = {
      name: input.name,
      taxId: input.taxId || undefined,
      category: input.category,
      contactPerson: input.contactPerson || undefined,
      email: input.email || undefined,
      phone: input.phone || undefined,
      address: input.address || undefined,
    };
    const done = { onSuccess: () => { reset(); onDone(); } };
    if (isEdit) update.mutate(payload, done);
    else create.mutate(payload, done);
  });

  const pending = isEdit ? update.isPending : create.isPending;
  const isError = isEdit ? update.isError : create.isError;

  return (
    <form onSubmit={onSubmit} className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <h3 className="mb-3 text-h3 text-neutral-950">{isEdit ? 'Edit vendor' : 'New vendor'}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="vnd-name">Vendor name <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="vnd-name" placeholder="PT Contoh Nusantara" error={!!errors.name} {...register('name')} />
          <FieldError message={errors.name?.message} />
        </div>
        <div>
          <Label htmlFor="vnd-tax">Tax ID (NPWP)</Label>
          <Input id="vnd-tax" placeholder="00.000.000.0-000.000" error={!!errors.taxId} {...register('taxId')} />
          <FieldError message={errors.taxId?.message} />
        </div>
        <div>
          <Label htmlFor="vnd-cat">Category</Label>
          <Controller name="category" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="vnd-cat"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </div>
        <div>
          <Label htmlFor="vnd-contact">Contact person</Label>
          <Input id="vnd-contact" placeholder="Nama PIC" error={!!errors.contactPerson} {...register('contactPerson')} />
          <FieldError message={errors.contactPerson?.message} />
        </div>
        <div>
          <Label htmlFor="vnd-email">Email</Label>
          <Input id="vnd-email" type="email" placeholder="sales@vendor.co.id" error={!!errors.email} {...register('email')} />
          <FieldError message={errors.email?.message} />
        </div>
        <div>
          <Label htmlFor="vnd-phone">Phone</Label>
          <Input id="vnd-phone" placeholder="+62 21 0000 0000" error={!!errors.phone} {...register('phone')} />
          <FieldError message={errors.phone?.message} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="vnd-address">Address</Label>
          <Input id="vnd-address" placeholder="Alamat / kota" error={!!errors.address} {...register('address')} />
          <FieldError message={errors.address?.message} />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" loading={pending}>{isEdit ? 'Save changes' : 'Create vendor'}</Button>
      </div>
      {isError && <p className="mt-2 text-caption text-destructive-600" role="alert">Failed to save. Check the data again.</p>}
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
    <form onSubmit={onSubmit} className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <h3 className="mb-3 text-h3 text-neutral-950">New fiscal period</h3>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="fp-code">Code (e.g. 2026-09) <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="fp-code" error={!!errors.periodCode} {...register('periodCode')} />
          <FieldError message={errors.periodCode?.message} />
        </div>
        <div>
          <Label htmlFor="fp-start">Start <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="fp-start" type="date" error={!!errors.startDate} {...register('startDate')} />
          <FieldError message={errors.startDate?.message} />
        </div>
        <div>
          <Label htmlFor="fp-end">End <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="fp-end" type="date" error={!!errors.endDate} {...register('endDate')} />
          <FieldError message={errors.endDate?.message} />
        </div>
        <Button type="submit" loading={create.isPending}>Create period</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600" role="alert">Failed to save. Check the data again.</p>}
    </form>
  );
}
