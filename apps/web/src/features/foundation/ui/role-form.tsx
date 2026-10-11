import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { createRoleSchema, type Role } from '@aec/api-contracts';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useCreateRole, useUpdateRole } from '@/entities/role';

const CATEGORIES = ['SYSTEM', 'FUNCTIONAL', 'PROJECT', 'CUSTOM'] as const;

const formSchema = z.object({
  code: createRoleSchema.shape.code,
  name: createRoleSchema.shape.name,
  description: z.string().max(500).optional(),
  category: z.enum(CATEGORIES),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});
type RoleFormValues = z.infer<typeof formSchema>;

function Err({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-caption text-destructive-600">{message}</p> : null;
}

/** Form buat/edit role — kategori & status dipilih dari daftar, bukan free-text. */
export function RoleForm({ onDone, editing }: { onDone: () => void; editing?: Role | null }) {
  const create = useCreateRole();
  const update = useUpdateRole(editing?.id ?? '');
  const isEdit = !!editing;
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<RoleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { code: '', name: '', description: '', category: 'CUSTOM', status: 'ACTIVE' },
  });

  useEffect(() => {
    reset({
      code: editing?.code ?? '',
      name: editing?.name ?? '',
      description: editing?.description ?? '',
      category: (editing?.category as RoleFormValues['category']) ?? 'CUSTOM',
      status: (editing?.status as RoleFormValues['status']) ?? 'ACTIVE',
    });
  }, [editing, reset]);

  const onSubmit = handleSubmit((input) => {
    if (isEdit) {
      update.mutate(
        { name: input.name, description: input.description || undefined, category: input.category, status: input.status },
        { onSuccess: () => { reset(); onDone(); } },
      );
    } else {
      create.mutate(
        { code: input.code, name: input.name, description: input.description || undefined, category: input.category, status: input.status },
        { onSuccess: () => { reset(); onDone(); } },
      );
    }
  });

  const pending = isEdit ? update.isPending : create.isPending;
  const isError = isEdit ? update.isError : create.isError;

  return (
    <form onSubmit={onSubmit} className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <h3 className="mb-3 text-h3 text-neutral-950">{isEdit ? `Edit ${editing?.name}` : 'New role'}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="r-code">Code <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="r-code" placeholder="PROCUREMENT_MANAGER" spellCheck={false} disabled={isEdit} error={!!errors.code} {...register('code')} />
          <Err message={errors.code?.message} />
        </div>
        <div>
          <Label htmlFor="r-name">Name <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="r-name" placeholder="Procurement Manager" error={!!errors.name} {...register('name')} />
          <Err message={errors.name?.message} />
        </div>
        <div>
          <Label htmlFor="r-category">Category</Label>
          <Controller name="category" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="r-category"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </div>
        <div>
          <Label htmlFor="r-status">Status</Label>
          <Controller name="status" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="r-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          )} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="r-desc">Description</Label>
          <Input id="r-desc" placeholder="What this role is responsible for" {...register('description')} />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" loading={pending}>{isEdit ? 'Save changes' : 'Create role'}</Button>
      </div>
      {isError && <p className="mt-2 text-caption text-destructive-600" role="alert">Failed to save. The role code may already be in use.</p>}
    </form>
  );
}
