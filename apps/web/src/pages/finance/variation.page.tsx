import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid, Input, Label } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useVariations, useCreateVariation, useApproveVariation, useRejectVariation, type Variation } from '@/features/finance';
import { formatIdr as fmt } from '@/shared/lib/format';

const PAGE_SIZE = 20;

const statusVariant: Record<string, 'default' | 'success' | 'warning'> = {
  POTENTIAL: 'default',
  APPROVED: 'success',
  REJECTED: 'warning',
};

const columnHelper = createColumnHelper<Variation>();

const columns = [
  columnHelper.accessor('variationNumber', {
    header: 'No. Variation',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  columnHelper.accessor('project', {
    header: 'Project',
    cell: (info) => <span className="text-neutral-700">{info.getValue()?.code}</span>,
  }),
  columnHelper.accessor('title', {
    header: 'Judul',
    cell: (info) => <span className="text-neutral-800">{info.getValue()}</span>,
  }),
  columnHelper.accessor('type', {
    header: 'Tipe',
    cell: (info) => {
      const t = info.getValue();
      return <Badge variant={t === 'ADDITIVE' ? 'success' : 'warning'}>{t}</Badge>;
    },
  }),
  columnHelper.accessor('amountChange', {
    header: 'Perubahan Nilai',
    cell: (info) => {
      const v = Number(info.getValue());
      const isAdditive = info.row.original.type === 'ADDITIVE';
      return <span className={`font-mono tabular-nums ${isAdditive ? 'text-emerald-700' : 'text-destructive-600'}`}>{isAdditive ? '+' : '-'}{fmt(v)}</span>;
    },
  }),
  columnHelper.accessor('scheduleImpactDays', {
    header: 'Dampak Jadwal',
    cell: (info) => {
      const v = info.getValue();
      return v != null ? <span className="font-mono tabular-nums text-neutral-700">{v > 0 ? `+${v} hari` : `${v} hari`}</span> : '—';
    },
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <ActionButtons variation={row.original} />,
  }),
];

function ActionButtons({ variation }: { variation: Variation }) {
  const approve = useApproveVariation();
  const reject = useRejectVariation();
  if (variation.status !== 'POTENTIAL') return null;
  return (
    <div className="flex items-center gap-1">
      <Button size="sm" variant="secondary" loading={approve.isPending} onClick={() => approve.mutate({ id: variation.id })}>
        Setujui
      </Button>
      <Button size="sm" variant="ghost" onClick={() => reject.mutate({ id: variation.id })}>
        Tolak
      </Button>
    </div>
  );
}

function VariationForm({ onDone }: { onDone: () => void }) {
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('ADDITIVE');
  const [amountChange, setAmountChange] = useState(0);
  const [scheduleImpactDays, setScheduleImpactDays] = useState('');
  const [description, setDescription] = useState('');
  const projects = useProjects({ page: 1, pageSize: 100 });
  const create = useCreateVariation();

  const onSubmit = () => {
    if (!projectId || !title || amountChange <= 0) return;
    create.mutate(
      {
        projectId,
        title,
        type,
        amountChange,
        scheduleImpactDays: scheduleImpactDays ? Number(scheduleImpactDays) : undefined,
        description: description || undefined,
      },
      { onSuccess: () => { setTitle(''); setType('ADDITIVE'); setAmountChange(0); setScheduleImpactDays(''); setDescription(''); onDone(); } },
    );
  };

  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="vr-project">Project</Label>
          <select
            id="vr-project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="">Pilih project…</option>
            {(projects.data?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="vr-title">Judul Variation</Label>
          <Input id="vr-title" placeholder="mis. Tambahan scope area X" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="vr-type">Tipe</Label>
          <select
            id="vr-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="ADDITIVE">ADDITIVE — menambah kontrak</option>
            <option value="DEDUCTIVE">DEDUCTIVE — mengurangi kontrak</option>
          </select>
        </div>
        <div>
          <Label htmlFor="vr-amount">Perubahan Nilai</Label>
          <Input id="vr-amount" type="number" min={0} step={100000} value={amountChange || ''} onChange={(e) => setAmountChange(Number(e.target.value))} />
        </div>
        <div>
          <Label htmlFor="vr-days">Dampak Jadwal (hari)</Label>
          <Input id="vr-days" type="number" min={-3650} max={3650} placeholder="Opsional" value={scheduleImpactDays} onChange={(e) => setScheduleImpactDays(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="vr-desc">Deskripsi</Label>
          <Input id="vr-desc" placeholder="Alasan variation…" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="button" onClick={onSubmit} loading={create.isPending}>Buat Variation POTENTIAL</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal membuat variation.</p>}
    </div>
  );
}

export function VariationPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading, isError, refetch } = useVariations({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize, status: statusFilter || undefined });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Variation Order</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Potential change tak ubah kontrak; approved variation update contract value (FR-CMR-005/006)</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label="Filter status"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPagination({ pageIndex: 0, pageSize: PAGE_SIZE }); }}
            className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="">Semua status</option>
            <option value="POTENTIAL">POTENTIAL</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
          <Button size="sm" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Tutup' : '+ Buat Variation'}
          </Button>
        </div>
      </div>

      {showForm && <VariationForm onDone={() => setShowForm(false)} />}

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
          emptyMessage="Belum ada variation"
        />
      </div>
    </div>
  );
}
