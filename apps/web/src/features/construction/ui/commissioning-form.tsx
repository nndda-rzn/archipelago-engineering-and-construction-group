import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { createCommissioningSchema } from '@aec/api-contracts';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useCreateCommissioning } from '../model/work-package.api';
import type { CommissioningSystem } from '@aec/api-contracts';

const flatten = (nodes: CommissioningSystem[], depth = 0): { id: string; label: string }[] =>
  nodes.flatMap((n) => [{ id: n.id, label: `${'-'.repeat(depth)} ${n.code} ${n.name}` }, ...flatten(n.children ?? [], depth + 1)]);

const formSchema = z.object({
  code: createCommissioningSchema.shape.code,
  name: createCommissioningSchema.shape.name,
  level: createCommissioningSchema.shape.level,
  parentId: z.string(),
  remark: createCommissioningSchema.shape.remark,
});
type FormValues = z.infer<typeof formSchema>;

export function CommissioningForm({ projectId, tree, onDone }: { projectId: string; tree: CommissioningSystem[]; onDone: () => void }) {
  const create = useCreateCommissioning(projectId);
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { code: '', name: '', level: 'SYSTEM', parentId: '', remark: '' },
  });
  const onSubmit = handleSubmit((input) =>
    create.mutate(
      { code: input.code, name: input.name, level: input.level, parentId: input.parentId || undefined, remark: input.remark || undefined },
      { onSuccess: () => { reset(); onDone(); } },
    )
  );

  return (
    <form onSubmit={onSubmit} className="mb-6 space-y-3 rounded-md border border-neutral-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <Label htmlFor="comm-code">Kode <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="comm-code" placeholder="PLANT-01" error={!!errors.code} {...register('code')} />
          {errors.code && <p className="mt-1 text-caption text-destructive-600">{errors.code.message}</p>}
        </div>
        <div>
          <Label htmlFor="comm-name">Nama <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="comm-name" placeholder="Process Plant" error={!!errors.name} {...register('name')} />
          {errors.name && <p className="mt-1 text-caption text-destructive-600">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="comm-level">Level</Label>
          <Controller name="level" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="comm-level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PLANT">Plant</SelectItem><SelectItem value="SYSTEM">System</SelectItem><SelectItem value="SUBSYSTEM">Subsystem</SelectItem><SelectItem value="EQUIPMENT">Equipment</SelectItem>
              </SelectContent>
            </Select>
          )} />
        </div>
        <div>
          <Label htmlFor="comm-parent">Parent</Label>
          <Controller name="parentId" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="comm-parent">
                <SelectValue placeholder="Root" />
              </SelectTrigger>
              <SelectContent>
                {flatten(tree).map((n) => <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </div>
        <div>
          <Label htmlFor="comm-remark">Catatan</Label>
          <Input id="comm-remark" placeholder="Opsional" error={!!errors.remark} {...register('remark')} />
          {errors.remark && <p className="mt-1 text-caption text-destructive-600">{errors.remark.message}</p>}
        </div>
      </div>
      <div className="flex justify-end gap-2"><Button size="sm" variant="secondary" type="button" onClick={onDone}>Batal</Button><Button size="sm" type="submit" loading={create.isPending}>Tambah</Button></div>
      {create.isError && <p className="mt-1 text-caption text-destructive-600" role="alert">Gagal menyimpan. Periksa kembali data.</p>}
    </form>
  );
}
