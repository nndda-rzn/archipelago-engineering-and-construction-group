import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createLegalEntitySchema, type LegalEntity, type LegalEntityListParams } from '@aec/api-contracts';
import { z } from 'zod';
import { createColumnHelper, type SortingState } from '@tanstack/react-table';
import { Button, Input, Label, Badge, DataGrid } from '@aec/ui';
import { useCreateLegalEntity, useLegalEntities } from '@/entities/legal-entity';

type CreateLegalEntityForm = {
  code: string;
  legalName: string;
  taxIdentifier: string;
  country: string;
  functionalCurrency: string;
  reportingCurrency: string;
};

const formSchema = z.object({
  code: createLegalEntitySchema.shape.code,
  legalName: createLegalEntitySchema.shape.legalName,
  taxIdentifier: createLegalEntitySchema.shape.taxIdentifier,
  country: createLegalEntitySchema.shape.country,
  functionalCurrency: z.string().length(3),
  reportingCurrency: z.string().length(3),
});

const statusVariant: Record<string, 'success' | 'warning' | 'muted' | 'default'> = {
  ACTIVE: 'success',
  BLOCKED: 'warning',
  INACTIVE: 'muted',
  ARCHIVED: 'muted',
};

const columnHelper = createColumnHelper<LegalEntity>();

const columns = [
  columnHelper.accessor('code', {
    header: 'Kode',
    enableSorting: true,
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  columnHelper.accessor('legalName', {
    header: 'Nama Legal',
    enableSorting: true,
    cell: (info) => <span className="text-neutral-900">{info.getValue()}</span>,
  }),
  columnHelper.accessor('taxIdentifier', {
    header: 'NPWP',
    enableSorting: true,
    cell: (info) => <span className="font-mono text-neutral-600">{info.getValue()}</span>,
  }),
  columnHelper.accessor('country', {
    header: 'Negara',
    enableSorting: true,
    cell: (info) => <span className="text-neutral-600">{info.getValue()}</span>,
  }),
  columnHelper.accessor('functionalCurrency', {
    header: 'Mata Uang',
    enableSorting: true,
    cell: (info) => <span className="font-mono text-neutral-600">{info.getValue()}</span>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    enableSorting: true,
    cell: (info) => {
      const status = info.getValue();
      return <Badge variant={statusVariant[status] ?? 'default'}>{status}</Badge>;
    },
  }),
];

const PAGE_SIZE = 20;

export function LegalEntityListPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [sorting, setSorting] = useState<SortingState>([]);

  const params: LegalEntityListParams = {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    sortBy: (sorting[0]?.id as LegalEntityListParams['sortBy']) ?? undefined,
    sortDir: sorting[0]?.desc ? 'desc' : 'asc',
  };

  const { data, isLoading, isError, refetch } = useLegalEntities(params);
  const create = useCreateLegalEntity();
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateLegalEntityForm>({
    resolver: zodResolver(formSchema),
    defaultValues: { functionalCurrency: 'IDR', reportingCurrency: 'IDR' },
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
          <h1 className="text-h1 text-neutral-950">Legal Entities</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Badan hukum perusahaan (FR-FND-001)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Tutup' : '+ Tambah Entity'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code">Kode</Label>
              <Input id="code" placeholder="AEC-EPC" error={!!errors.code} {...register('code')} />
              {errors.code && <p className="mt-1 text-caption text-destructive-600">{errors.code.message}</p>}
            </div>
            <div>
              <Label htmlFor="legalName">Nama Legal</Label>
              <Input id="legalName" placeholder="PT AEC EPC" error={!!errors.legalName} {...register('legalName')} />
              {errors.legalName && <p className="mt-1 text-caption text-destructive-600">{errors.legalName.message}</p>}
            </div>
            <div>
              <Label htmlFor="taxIdentifier">NPWP</Label>
              <Input id="taxIdentifier" placeholder="00.000.000.0-000.000" error={!!errors.taxIdentifier} {...register('taxIdentifier')} />
              {errors.taxIdentifier && <p className="mt-1 text-caption text-destructive-600">{errors.taxIdentifier.message}</p>}
            </div>
            <div>
              <Label htmlFor="country">Negara</Label>
              <Input id="country" placeholder="ID" maxLength={2} error={!!errors.country} {...register('country')} />
              {errors.country && <p className="mt-1 text-caption text-destructive-600">{errors.country.message}</p>}
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Batal</Button>
            <Button type="submit" loading={create.isPending}>Simpan</Button>
          </div>
          {create.isError && (
            <p className="mt-2 text-caption text-destructive-600">Gagal membuat entity. Periksa kode/NPWP.</p>
          )}
        </form>
      )}

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
          emptyMessage="Belum ada legal entity"
        />
      </div>
    </div>
  );
}
