import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserSchema, type User } from '@aec/api-contracts';
import { z } from 'zod';
import { createColumnHelper, type SortingState } from '@tanstack/react-table';
import { Badge, Button, DataGrid, Input, Label } from '@aec/ui';
import { useBlockUser, useCreateUser, useUsers } from '@/entities/user';

const PAGE_SIZE = 20;

const statusVariant: Record<string, 'success' | 'warning' | 'muted'> = {
  ACTIVE: 'success',
  BLOCKED: 'warning',
  INACTIVE: 'muted',
};

const columnHelper = createColumnHelper<User>();

const columns = [
  columnHelper.accessor('username', {
    header: 'Username',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  columnHelper.accessor('displayName', {
    header: 'Nama',
    cell: (info) => <span className="text-neutral-900">{info.getValue()}</span>,
  }),
  columnHelper.accessor('email', {
    header: 'Email',
    cell: (info) => <span className="text-neutral-600">{info.getValue()}</span>,
  }),
  columnHelper.accessor('roles', {
    header: 'Roles',
    cell: (info) => (
      <span className="flex flex-wrap gap-1">
        {info.getValue().map((role) => (
          <Badge key={role} variant="default">{role}</Badge>
        ))}
      </span>
    ),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'muted'}>{info.getValue()}</Badge>,
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="flex justify-end gap-1">
          <BlockButton id={user.id} disabled={user.status !== 'ACTIVE'} />
        </div>
      );
    },
  }),
];

function BlockButton({ id, disabled }: { id: string; disabled: boolean }) {
  const block = useBlockUser();
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={disabled}
      onClick={() => {
        if (window.confirm('Blokir user ini?')) block.mutate(id);
      }}
    >
      Blokir
    </Button>
  );
}

const formSchema = z.object({
  username: createUserSchema.shape.username,
  email: createUserSchema.shape.email,
  displayName: createUserSchema.shape.displayName,
  password: createUserSchema.shape.password,
  roleCode: z.string().optional(),
});

export function UserManagementPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, isError, refetch } = useUsers({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    search: search || undefined,
  });
  const create = useCreateUser();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = handleSubmit((input) => {
    create.mutate(
      { ...input, roleCode: input.roleCode || undefined },
      {
        onSuccess: () => {
          reset();
          setShowForm(false);
        },
      },
    );
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">User Management</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Pengguna sistem &amp; assignment role (FR-FND-003)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Tutup' : '+ Tambah User'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input id="username" placeholder="buyer1" spellCheck={false} error={!!errors.username} {...register('username')} />
              {errors.username && <p className="mt-1 text-caption text-destructive-600">{errors.username.message}</p>}
            </div>
            <div>
              <Label htmlFor="displayName">Nama</Label>
              <Input id="displayName" placeholder="Buyer Satu" error={!!errors.displayName} {...register('displayName')} />
              {errors.displayName && <p className="mt-1 text-caption text-destructive-600">{errors.displayName.message}</p>}
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="nama@perusahaan.com" spellCheck={false} error={!!errors.email} {...register('email')} />
              {errors.email && <p className="mt-1 text-caption text-destructive-600">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="Min. 8 karakter" spellCheck={false} error={!!errors.password} {...register('password')} />
              {errors.password && <p className="mt-1 text-caption text-destructive-600">{errors.password.message}</p>}
            </div>
            <div>
              <Label htmlFor="roleCode">Role</Label>
              <Input id="roleCode" placeholder="SUPER_ADMIN" spellCheck={false} {...register('roleCode')} />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Batal</Button>
            <Button type="submit" loading={create.isPending}>Simpan</Button>
          </div>
          {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal membuat user. Username/email mungkin sudah dipakai.</p>}
        </form>
      )}

      <div className="mb-4 flex items-center gap-2">
        <div className="w-64">
          <Input
            type="search"
            placeholder="Cari username, nama, email…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((p) => ({ ...p, pageIndex: 0 }));
            }}
          />
        </div>
      </div>

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        <DataGrid
          columns={columns}
          data={data?.items ?? []}
          rowCount={data?.total ?? 0}
          pagination={pagination}
          onPaginationChange={setPagination}
          sorting={sorting}
          onSortingChange={setSorting}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          emptyMessage="Belum ada user"
        />
      </div>
    </div>
  );
}
