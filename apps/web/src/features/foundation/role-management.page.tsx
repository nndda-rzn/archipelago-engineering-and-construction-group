import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createRoleSchema, type RoleWithPermissions } from '@aec/api-contracts';
import { z } from 'zod';
import { Badge, Button, Input, Label } from '@aec/ui';
import { useCreateRole, useRoles } from './role.api';

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
          <p className="mt-1 text-body-sm text-neutral-500">Role &amp; permission assignment (FR-FND-004)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Tutup' : '+ Tambah Role'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code">Kode Role</Label>
              <Input id="code" placeholder="PROCUREMENT_MANAGER" spellCheck={false} error={!!errors.code} {...register('code')} />
              {errors.code && <p className="mt-1 text-caption text-destructive-600">{errors.code.message}</p>}
            </div>
            <div>
              <Label htmlFor="name">Nama</Label>
              <Input id="name" placeholder="Procurement Manager" error={!!errors.name} {...register('name')} />
              {errors.name && <p className="mt-1 text-caption text-destructive-600">{errors.name.message}</p>}
            </div>
            <div className="col-span-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Input id="description" placeholder="Ringkasan tanggung jawab role" {...register('description')} />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Batal</Button>
            <Button type="submit" loading={create.isPending}>Simpan</Button>
          </div>
        </form>
      )}

      {isLoading && <p className="p-6 text-body-sm text-neutral-500">Memuat…</p>}
      {isError && (
        <p className="p-6 text-body-sm text-destructive-600">
          Gagal memuat role.{' '}
          <button type="button" className="text-racing-red-600 hover:underline" onClick={() => refetch()}>Coba lagi</button>
        </p>
      )}

      {data && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((role: RoleWithPermissions) => (
            <div key={role.id} className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-body-sm font-medium text-neutral-900">{role.code}</span>
                <Badge variant="default">{role._count.userRoles} user</Badge>
              </div>
              <div className="mt-1 text-body-sm text-neutral-600">{role.name}</div>
              <div className="mt-3 flex flex-wrap gap-1">
                {role.permissions.map(({ permission }) => (
                  <Badge key={permission.code} variant="outline">{permission.code}</Badge>
                ))}
                {role.permissions.length === 0 && (
                  <span className="text-caption text-neutral-400">Belum ada permission</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
