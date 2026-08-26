import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid, Input, Label } from '@aec/ui';
import { useProjects } from '@/entities/project';
import {
  useSubcontracts, useCreateSubcontract, useSubcontractProgress, useCreateSubcontractProgress,
  useVerifySubcontractProgress, useRejectSubcontractProgress, type Subcontract, type SubcontractProgress,
} from '@/features/finance';
import { formatIdr as fmt } from '@/shared/lib/format';

const PAGE_SIZE = 20;

const statusVariant: Record<string, 'default' | 'success' | 'warning'> = {
  DRAFT: 'default',
  ACTIVE: 'success',
  COMPLETED: 'success',
  TERMINATED: 'warning',
};

const progressVariant: Record<string, 'default' | 'success' | 'warning'> = {
  SUBMITTED: 'default',
  VERIFIED: 'success',
  REJECTED: 'warning',
};

const columnHelper = createColumnHelper<Subcontract>();
const progColumnHelper = createColumnHelper<SubcontractProgress>();

const columns = [
  columnHelper.accessor('subconNumber', {
    header: 'No. Subkon',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  columnHelper.accessor('project', {
    header: 'Project',
    cell: (info) => <span className="text-neutral-700">{info.getValue()?.code}</span>,
  }),
  columnHelper.accessor('vendor', {
    header: 'Vendor',
    cell: (info) => <span className="text-neutral-800">{info.getValue()}</span>,
  }),
  columnHelper.accessor('title', {
    header: 'Judul',
    cell: (info) => <span className="text-neutral-700">{info.getValue()}</span>,
  }),
  columnHelper.accessor('contractValue', {
    header: 'Nilai Kontrak',
    cell: (info) => <span className="font-mono tabular-nums text-neutral-800 font-medium">{fmt(info.getValue())}</span>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
];

const progressColumns = [
  progColumnHelper.accessor('period', {
    header: 'Periode',
    cell: (info) => <span className="font-mono text-neutral-600">{info.getValue() ?? '-'}</span>,
  }),
  progColumnHelper.accessor('progressDate', {
    header: 'Tanggal',
    cell: (info) => <span className="font-mono text-neutral-600">{new Date(info.getValue()).toLocaleDateString('id-ID')}</span>,
  }),
  progColumnHelper.accessor('progressPercent', {
    header: 'Progress',
    cell: (info) => <span className="font-mono tabular-nums text-neutral-700">{info.getValue()}%</span>,
  }),
  progColumnHelper.accessor('verifiedAmount', {
    header: 'Nilai Bayar',
    cell: (info) => <span className="font-mono tabular-nums text-neutral-800 font-medium">{fmt(info.getValue())}</span>,
  }),
  progColumnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={progressVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  progColumnHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <ProgressActions entry={row.original} />,
  }),
];

function ProgressActions({ entry }: { entry: SubcontractProgress }) {
  const verify = useVerifySubcontractProgress();
  const reject = useRejectSubcontractProgress();
  if (entry.status !== 'SUBMITTED') return null;
  return (
    <div className="flex items-center gap-1">
      <Button size="sm" variant="secondary" loading={verify.isPending} onClick={() => verify.mutate({ subcontractId: entry.subcontractId, progressId: entry.id })}>
        Verifikasi
      </Button>
      <Button size="sm" variant="ghost" onClick={() => reject.mutate({ subcontractId: entry.subcontractId, progressId: entry.id })}>
        Tolak
      </Button>
    </div>
  );
}

function SubconForm({ onDone }: { onDone: () => void }) {
  const [projectId, setProjectId] = useState('');
  const [vendor, setVendor] = useState('');
  const [title, setTitle] = useState('');
  const [contractValue, setContractValue] = useState(0);
  const projects = useProjects({ page: 1, pageSize: 100 });
  const create = useCreateSubcontract();

  const onSubmit = () => {
    if (!projectId || !vendor || !title || contractValue <= 0) return;
    create.mutate(
      { projectId, vendor, title, contractValue },
      { onSuccess: () => { setVendor(''); setTitle(''); setContractValue(0); onDone(); } },
    );
  };

  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="sc-project">Project</Label>
          <select
            id="sc-project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="">Pilih project…</option>
            {(projects.data?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="sc-vendor">Vendor Subkon</Label>
          <Input id="sc-vendor" placeholder="PT. Subkon Sejahtera" value={vendor} onChange={(e) => setVendor(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="sc-title">Judul Pekerjaan</Label>
          <Input id="sc-title" placeholder="mis. Struktur baja area B" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="sc-value">Nilai Kontrak</Label>
          <Input id="sc-value" type="number" min={0} step={100000} value={contractValue || ''} onChange={(e) => setContractValue(Number(e.target.value))} />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="button" onClick={onSubmit} loading={create.isPending}>Buat Subcontract</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal membuat subcontract.</p>}
    </div>
  );
}

function ProgressForm({ subcontract }: { subcontract: Subcontract }) {
  const [progressPercent, setProgressPercent] = useState('');
  const [period, setPeriod] = useState('');
  const create = useCreateSubcontractProgress();

  const onSubmit = () => {
    if (!progressPercent) return;
    create.mutate(
      { subcontractId: subcontract.id, progressPercent: Number(progressPercent), period: period || undefined },
      { onSuccess: () => { setProgressPercent(''); setPeriod(''); } },
    );
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div>
        <Label htmlFor="scp-period">Periode</Label>
        <Input id="scp-period" placeholder="mis. 2026-09" value={period} onChange={(e) => setPeriod(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="scp-progress">Progress Fisik (%)</Label>
        <Input id="scp-progress" type="number" min={0} max={100} placeholder="mis. 35" value={progressPercent} onChange={(e) => setProgressPercent(e.target.value)} />
      </div>
      <Button onClick={onSubmit} loading={create.isPending}>Kirim Progress</Button>
      {create.isError && <p className="text-caption text-destructive-600">Gagal kirim progress.</p>}
    </div>
  );
}

export function SubcontractPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading, isError, refetch } = useSubcontracts({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize, status: statusFilter || undefined });
  const { data: progressData, isLoading: progressLoading } = useSubcontractProgress(selectedId ?? '', { page: 1, pageSize: 50 });

  const selected = data?.items.find((s) => s.id === selectedId) ?? null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Subcontract</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Pembayaran subkon berdasarkan verified progress (FR-CMR-008)</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label="Filter status"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPagination({ pageIndex: 0, pageSize: PAGE_SIZE }); }}
            className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="">Semua status</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>
          <Button size="sm" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Tutup' : '+ Buat Subcontract'}
          </Button>
        </div>
      </div>

      {showForm && <SubconForm onDone={() => setShowForm(false)} />}

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
          onRowClick={(row) => setSelectedId(row.original.id)}
          emptyMessage="Belum ada subcontract"
        />
      </div>

      {selected && (
        <div className="mt-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-h2 text-neutral-950">{selected.subconNumber} — {selected.title}</h2>
              <p className="text-caption text-neutral-500">
                {selected.vendor} · Nilai kontrak {fmt(selected.contractValue)} · Klik baris lain untuk ganti
              </p>
            </div>
          </div>
          <ProgressForm subcontract={selected} />
          <div className="mt-4">
            <DataGrid
              columns={progressColumns}
              data={progressData?.items ?? []}
              rowCount={progressData?.total ?? 0}
              isLoading={progressLoading}
              emptyMessage="Belum ada progress"
            />
          </div>
        </div>
      )}
    </div>
  );
}
