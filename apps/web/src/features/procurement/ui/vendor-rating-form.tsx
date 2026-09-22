import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useCreateVendorRating } from '@/features/procurement';
import { useProjects } from '@/entities/project';
import { useVendors } from '@/features/master-data';

const CATEGORIES = ['DELIVERY', 'QUALITY', 'COMMERCIAL', 'HSE', 'RESPONSIVENESS'] as const;

const formSchema = z.object({
  vendorId: z.string().min(1, 'Vendor wajib dipilih'),
  projectId: z.string(),
  category: z.enum(['DELIVERY', 'QUALITY', 'COMMERCIAL', 'HSE', 'RESPONSIVENESS']),
  score: z.string().refine((v) => v !== '', 'Skor wajib dipilih'),
  remark: z.string().max(1000),
});
type FormValues = z.infer<typeof formSchema>;

export function VendorRatingForm() {
  const vendors = useVendors({ page: 1, pageSize: 100 });
  const projects = useProjects({ page: 1, pageSize: 100 });
  const create = useCreateVendorRating();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { vendorId: '', projectId: '', category: CATEGORIES[0], score: '', remark: '' },
  });

  const onSubmit = handleSubmit((input) =>
    create.mutate(
      { vendorId: input.vendorId, projectId: input.projectId || undefined, category: input.category, score: Number(input.score), remark: input.remark || undefined },
      { onSuccess: () => { reset(); } },
    )
  );

  return (
    <form onSubmit={onSubmit} className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <h3 className="mb-3 text-h3 text-neutral-900">Beri Rating Vendor</h3>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="vr-vendor">Vendor <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Controller name="vendorId" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="vr-vendor">
                <SelectValue placeholder="Pilih vendor…" />
              </SelectTrigger>
              <SelectContent>
                {(vendors.data?.items ?? []).map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
          {errors.vendorId && <p className="mt-1 text-caption text-destructive-600">{errors.vendorId.message}</p>}
        </div>
        <div>
          <Label htmlFor="vr-project">Project (opsional)</Label>
          <Controller name="projectId" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="vr-project">
                <SelectValue placeholder="Semua" />
              </SelectTrigger>
              <SelectContent>
                {(projects.data?.items ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </div>
        <div>
          <Label htmlFor="vr-category">Kategori</Label>
          <Controller name="category" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="vr-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </div>
        <div>
          <Label htmlFor="vr-score">Skor <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Controller name="score" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="vr-score">
                <SelectValue placeholder="-" />
              </SelectTrigger>
              <SelectContent>
                {['1', '2', '3', '4', '5'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
          {errors.score && <p className="mt-1 text-caption text-destructive-600">{errors.score.message}</p>}
        </div>
        <div className="flex-1">
          <Label htmlFor="vr-remark">Catatan</Label>
          <Input id="vr-remark" {...register('remark')} />
        </div>
        <Button type="submit" loading={create.isPending}>Beri Rating</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal memberi rating.</p>}
    </form>
  );
}
