import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createRoleSchema, type RoleWithPermissions } from '@aec/api-contracts';
import { z } from 'zod';
import { Badge, Button, Input, Label, labelPermission } from '@aec/ui';
import { useCreateRole, useRoles } from '@/entities/role';

const formSchema = z.object({
  code: createRoleSchema.shape.code,
  name: createRoleSchema.shape.name,
  description: z.string().optional(),
});

export function RoleManagementPage() {
  const { data, isLoading, isError, refetch } = useRoles();
  const create = useCreateRole();
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
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
          <h1 className="text-h1 text-neutral-950">Role Management</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Role &amp; permission assignment</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Close' : '+ Add Role'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="code">Role Code</Label>
              <Input id="code" placeholder="PROCUREMENT_MANAGER" spellCheck={false} error={!!errors.code} {...register('code')} />
              {errors.code && <p className="mt-1 text-caption text-destructive-600">{errors.code.message}</p>}
            </div>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Procurement Manager" error={!!errors.name} {...register('name')} />
              {errors.name && <p className="mt-1 text-caption text-destructive-600">{errors.name.message}</p>}
            </div>
            <div className="col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" placeholder="Summary of the role responsibilities" {...register('description')} />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" loading={create.isPending}>Save</Button>
          </div>
        </form>
      )}

      {isLoading && <p className="p-6 text-body-sm text-neutral-500">Loading…</p>}
      {isError && (
        <p className="p-6 text-body-sm text-destructive-600">
          Failed to load roles.{' '}
          <button type="button" className="text-racing-red-600 hover:underline" onClick={() => refetch()}>Try again</button>
        </p>
      )}

      {data && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((role: RoleWithPermissions) => (
            <div key={role.id} className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-body-sm font-medium text-neutral-900">{role.name}</span>
                <Badge variant="default">{role.memberCount} user</Badge>
              </div>
              <div className="mt-1 font-mono text-caption text-neutral-500">{role.code}</div>
              <div className="mt-3 flex flex-wrap gap-1">
                {role.permissions.map((permission) => (
                  <Badge key={permission.code} variant="outline">{labelPermission(permission.code)}</Badge>
                ))}
                {role.permissions.length === 0 && (
                  <span className="text-caption text-neutral-500">No permissions yet</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
