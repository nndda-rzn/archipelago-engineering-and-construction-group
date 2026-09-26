import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { createUserSchema } from '@aec/api-contracts';
import { z } from 'zod';
import { Button, Input, Label } from '@aec/ui';
import { useCreateUser } from '@/entities/user';

const formSchema = z.object({
  username: createUserSchema.shape.username,
  email: createUserSchema.shape.email,
  displayName: createUserSchema.shape.displayName,
  password: createUserSchema.shape.password,
  roleCode: z.string().optional(),
});
type UserFormValues = z.infer<typeof formSchema>;

export function UserForm({ onDone }: { onDone: () => void }) {
  const create = useCreateUser();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<UserFormValues>({ resolver: zodResolver(formSchema) });
  const onSubmit = handleSubmit((input) => create.mutate({ ...input, roleCode: input.roleCode || undefined }, { onSuccess: () => { reset(); onDone(); } }));

  return (
    <form onSubmit={onSubmit} className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div><Label htmlFor="username">Username</Label><Input id="username" placeholder="buyer1" spellCheck={false} error={!!errors.username} {...register('username')} />{errors.username && <p className="mt-1 text-caption text-destructive-600">{errors.username.message}</p>}</div>
        <div><Label htmlFor="displayName">Name</Label><Input id="displayName" placeholder="Buyer Satu" error={!!errors.displayName} {...register('displayName')} />{errors.displayName && <p className="mt-1 text-caption text-destructive-600">{errors.displayName.message}</p>}</div>
        <div><Label htmlFor="email">Email</Label><Input id="email" type="email" placeholder="name@company.com" spellCheck={false} error={!!errors.email} {...register('email')} />{errors.email && <p className="mt-1 text-caption text-destructive-600">{errors.email.message}</p>}</div>
        <div><Label htmlFor="password">Password</Label><Input id="password" type="password" placeholder="Min. 8 characters" spellCheck={false} error={!!errors.password} {...register('password')} />{errors.password && <p className="mt-1 text-caption text-destructive-600">{errors.password.message}</p>}</div>
        <div><Label htmlFor="roleCode">Role</Label><Input id="roleCode" placeholder="PROCUREMENT_MANAGER" spellCheck={false} {...register('roleCode')} /></div>
      </div>
      <div className="mt-4 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onDone}>Cancel</Button><Button type="submit" loading={create.isPending}>Save</Button></div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Failed to create the user. The username or email may already be in use.</p>}
    </form>
  );
}
