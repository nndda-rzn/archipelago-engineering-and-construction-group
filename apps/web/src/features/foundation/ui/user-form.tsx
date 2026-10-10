import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { createUserSchema, type User } from '@aec/api-contracts';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useCreateUser, useUpdateUser } from '@/entities/user';
import { useRoles } from '@/entities/role';

const formSchema = z.object({
  username: createUserSchema.shape.username,
  email: createUserSchema.shape.email,
  displayName: createUserSchema.shape.displayName,
  password: z.string().min(8).max(100).or(z.literal('')),
  roleCode: z.string().optional(),
  jobTitle: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
});
type UserFormValues = z.infer<typeof formSchema>;

function Err({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-caption text-destructive-600">{message}</p> : null;
}

/** Form buat/edit user — role dipilih dari daftar (bukan free-text). */
export function UserForm({ onDone, editing }: { onDone: () => void; editing?: User | null }) {
  const create = useCreateUser();
  const update = useUpdateUser(editing?.id ?? '');
  const roles = useRoles();
  const isEdit = !!editing;
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<UserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: '', email: '', displayName: '', password: '', roleCode: '', jobTitle: '', department: '', phone: '' },
  });

  useEffect(() => {
    reset({
      username: editing?.username ?? '',
      email: editing?.email ?? '',
      displayName: editing?.displayName ?? '',
      password: '',
      roleCode: '',
      jobTitle: editing?.jobTitle ?? '',
      department: editing?.department ?? '',
      phone: editing?.phone ?? '',
    });
  }, [editing, reset]);

  const onSubmit = handleSubmit((input) => {
    if (isEdit) {
      update.mutate(
        { displayName: input.displayName, email: input.email, jobTitle: input.jobTitle || undefined, department: input.department || undefined, phone: input.phone || undefined },
        { onSuccess: () => { reset(); onDone(); } },
      );
    } else {
      create.mutate(
        {
          username: input.username, email: input.email, displayName: input.displayName, password: input.password,
          roleCode: input.roleCode || undefined, jobTitle: input.jobTitle || undefined, department: input.department || undefined, phone: input.phone || undefined,
        },
        { onSuccess: () => { reset(); onDone(); } },
      );
    }
  });

  const pending = isEdit ? update.isPending : create.isPending;
  const isError = isEdit ? update.isError : create.isError;
  const roleOptions = roles.data ?? [];

  return (
    <form onSubmit={onSubmit} className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <h3 className="mb-3 text-h3 text-neutral-950">{isEdit ? `Edit ${editing?.displayName}` : 'New user'}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="u-username">Username <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="u-username" placeholder="buyer1" spellCheck={false} disabled={isEdit} error={!!errors.username} {...register('username')} />
          <Err message={errors.username?.message} />
        </div>
        <div>
          <Label htmlFor="u-name">Full name <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="u-name" placeholder="Buyer Satu" error={!!errors.displayName} {...register('displayName')} />
          <Err message={errors.displayName?.message} />
        </div>
        <div>
          <Label htmlFor="u-email">Email <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="u-email" type="email" placeholder="name@company.com" spellCheck={false} error={!!errors.email} {...register('email')} />
          <Err message={errors.email?.message} />
        </div>
        {!isEdit && (
          <div>
            <Label htmlFor="u-password">Password <span aria-hidden="true" className="text-destructive-600">*</span></Label>
            <Input id="u-password" type="password" placeholder="Min. 8 characters" spellCheck={false} error={!!errors.password} {...register('password')} />
            <Err message={errors.password?.message} />
          </div>
        )}
        <div>
          <Label htmlFor="u-job">Job title</Label>
          <Input id="u-job" placeholder="Procurement Officer" error={!!errors.jobTitle} {...register('jobTitle')} />
        </div>
        <div>
          <Label htmlFor="u-dept">Department</Label>
          <Input id="u-dept" placeholder="Procurement" error={!!errors.department} {...register('department')} />
        </div>
        <div>
          <Label htmlFor="u-phone">Phone</Label>
          <Input id="u-phone" placeholder="+62 811 0000 000" error={!!errors.phone} {...register('phone')} />
        </div>
        {!isEdit && (
          <div>
            <Label htmlFor="u-role">Initial role</Label>
            <Controller name="roleCode" control={control} render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger id="u-role"><SelectValue placeholder="No role" /></SelectTrigger>
                <SelectContent>
                  {roleOptions.map((r) => <SelectItem key={r.id} value={r.code}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
          </div>
        )}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" loading={pending}>{isEdit ? 'Save changes' : 'Create user'}</Button>
      </div>
      {isError && <p className="mt-2 text-caption text-destructive-600" role="alert">Failed to save. The username or email may already be in use.</p>}
    </form>
  );
}
