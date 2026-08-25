import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProjectSchema, projectSchema, type Project } from '@aec/api-contracts';
import { z } from 'zod';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid, Input, Label } from '@aec/ui';
import { useCreateProject, useProjects } from '@/entities/project';
import { useLegalEntities } from '@/entities/legal-entity';
import { formatIdr } from '@/shared/lib/format';

const PAGE_SIZE = 20;

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'info' | 'muted'> = {
  PLANNING: 'info',
  ACTIVE: 'success',
  ON_HOLD: 'warning',
  COMPLETED: 'default',
  CLOSED: 'muted',
};

const columnHelper = createColumnHelper<Project>();

const columns = [
  columnHelper.accessor('code', {
    header: 'Kode',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  columnHelper.accessor('name', {
    header: 'Nama Project',
    cell: (info) => <span className="text-neutral-900">{info.getValue()}</span>,
  }),
  columnHelper.accessor('client', {
    header: 'Klien',
    cell: (info) => <span className="text-neutral-600">{info.getValue()}</span>,
  }),
  columnHelper.accessor('location', {
    header: 'Lokasi',
    cell: (info) => <span className="text-neutral-600">{info.getValue() ?? '-'}</span>,
  }),
  columnHelper.accessor('contractValue', {
    header: 'Nilai Kontrak',
    cell: (info) => {
      const v = info.getValue();
      return (
        <span className="font-mono tabular-nums text-neutral-700">
          {v != null ? formatIdr(v) : '-'}
        </span>
      );
    },
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
];

const formSchema = z.object({
  code: createProjectSchema.shape.code,
  name: createProjectSchema.shape.name,
  client: createProjectSchema.shape.client,
  legalEntityId: createProjectSchema.shape.legalEntityId,
  location: z.string().optional(),
});

export function ProjectListPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, isError, refetch } = useProjects({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    search: search || undefined,
  });
  const entities = useLegalEntities({ page: 1, pageSize: 100 });
  const create = useCreateProject();

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
          <h1 className="text-h1 text-neutral-950">Projects</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Project master (FR-PRJ-001)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Tutup' : '+ Tambah Project'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code">Kode Project</Label>
              <Input id="code" placeholder="PRJ-EPC-2027-014" spellCheck={false} error={!!errors.code} {...register('code')} />
              {errors.code && <p className="mt-1 text-caption text-destructive-600">{errors.code.message}</p>}
            </div>
            <div>
              <Label htmlFor="name">Nama Project</Label>
              <Input id="name" placeholder="EPC Industrial Processing Facility" error={!!errors.name} {...register('name')} />
              {errors.name && <p className="mt-1 text-caption text-destructive-600">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="client">Klien</Label>
              <Input id="client" placeholder="PT Klien Utama" error={!!errors.client} {...register('client')} />
              {errors.client && <p className="mt-1 text-caption text-destructive-600">{errors.client.message}</p>}
            </div>
            <div>
              <Label htmlFor="legalEntityId">Legal Entity</Label>
              <select
                id="legalEntityId"
                className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body text-neutral-900 hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
                {...register('legalEntityId')}
              >
                <option value="">Pilih entity…</option>
                {(entities.data?.items ?? []).map((e) => (
                  <option key={e.id} value={e.id}>{e.code} — {e.legalName}</option>
                ))}
              </select>
              {errors.legalEntityId && <p className="mt-1 text-caption text-destructive-600">{errors.legalEntityId.message}</p>}
            </div>
            <div className="col-span-2">
              <Label htmlFor="location">Lokasi</Label>
              <Input id="location" placeholder="Karawang" {...register('location')} />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Batal</Button>
            <Button type="submit" loading={create.isPending}>Simpan</Button>
          </div>
          {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal membuat project. Kode mungkin sudah dipakai.</p>}
        </form>
      )}

      <div className="mb-4 w-64">
        <Input
          type="search"
          placeholder="Cari kode, nama, klien…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
        />
      </div>

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        <DataGrid
          columns={columns}
          data={data?.items ?? []}
          rowCount={data?.total ?? 0}
          pagination={pagination}
          onPaginationChange={setPagination}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          emptyMessage="Belum ada project"
        />
      </div>
    </div>
  );
}
