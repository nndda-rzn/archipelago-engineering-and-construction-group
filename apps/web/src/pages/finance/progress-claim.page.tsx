import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid, Input, Label } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useWorkPackages } from '@/features/construction';
import { useCreateProgressClaim, useCertifyClaim, useProgressClaims, type ProgressClaim } from '@/features/finance';
import { formatIdr as fmt } from '@/shared/lib/format';

const PAGE_SIZE = 20;

const statusVariant: Record<string, 'default' | 'success' | 'warning'> = {
  DRAFT: 'default',
  CERTIFIED: 'success',
  REJECTED: 'warning',
  REVISED: 'warning',
};

const columnHelper = createColumnHelper<ProgressClaim>();

const columns = [
  columnHelper.accessor('claimNumber', {
    header: 'No. Klaim',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  columnHelper.accessor('project', {
    header: 'Project',
    cell: (info) => <span className="text-neutral-700">{info.getValue()?.code}</span>,
  }),
  columnHelper.accessor('workPackage', {
    header: 'Work Package',
    cell: (info) => {
      const wp = info.getValue();
      return wp ? <span className="font-mono text-neutral-600">{wp.wpNumber}</span> : '—';
    },
  }),
  columnHelper.accessor('physicalProgressAtClaim', {
    header: 'Fisik',
    cell: (info) => (info.getValue() != null ? <span className="font-mono tabular-nums text-neutral-600">{info.getValue()}%</span> : '—'),
  }),
  columnHelper.accessor('billableProgress', {
    header: 'Billable',
    cell: (info) => (info.getValue() != null ? <span className="font-mono tabular-nums text-neutral-700">{info.getValue()}%</span> : '—'),
  }),
  columnHelper.accessor('period', {
    header: 'Periode',
    cell: (info) => <span className="font-mono text-neutral-600">{info.getValue() ?? '-'}</span>,
  }),
  columnHelper.accessor('amount', {
    header: 'Nilai Klaim',
    cell: (info) => <span className="font-mono tabular-nums text-neutral-700">{fmt(info.getValue())}</span>,
  }),
  columnHelper.accessor('certifiedAmount', {
    header: 'Tersertifikasi',
    cell: (info) => {
      const v = info.getValue();
      return <span className="font-mono tabular-nums text-neutral-700">{v != null ? fmt(v) : '—'}</span>;
    },
  }),
  columnHelper.accessor('retentionRate', {
    header: 'Retensi',
    cell: (info) => {
      const rate = info.getValue();
      const row = info.row.original;
      if (rate == null || row.status !== 'CERTIFIED') return '—';
      return (
        <span className="font-mono tabular-nums text-neutral-600">
          {row.retentionAmount != null ? `${fmt(row.retentionAmount)} (${rate}%)` : `${rate}%`}
        </span>
      );
    },
  }),
  columnHelper.accessor('netCertifiedAmount', {
    header: 'Net',
    cell: (info) => {
      const v = info.getValue();
      return v != null ? <span className="font-mono tabular-nums text-neutral-800 font-medium">{fmt(v)}</span> : '—';
    },
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <CertifyButton claim={row.original} />,
  }),
];

function CertifyButton({ claim }: { claim: ProgressClaim }) {
  const certify = useCertifyClaim();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(Number(claim.amount));
  const [retentionRate, setRetentionRate] = useState(5);

  if (claim.status !== 'DRAFT') return null;

  const retention = Math.round(amount * retentionRate) / 100;
  const net = Math.round((amount - retention) * 100) / 100;

  return open ? (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={0}
        step={100000}
        value={amount || ''}
        onChange={(e) => setAmount(Number(e.target.value))}
        className="h-8 w-32 text-right"
        aria-label="Nilai sertifikasi"
      />
      <div className="flex items-center gap-1">
        <Input
          type="number"
          min={0}
          max={100}
          value={retentionRate || ''}
          onChange={(e) => setRetentionRate(Number(e.target.value))}
          className="h-8 w-16 text-right"
          aria-label="Retensi (%)"
        />
        <span className="text-caption text-neutral-500">%</span>
      </div>
      <span className="hidden text-caption text-neutral-500 xl:inline" title="Retensi → Net">
        {fmt(retention)} → {fmt(net)}
      </span>
      <Button
        size="sm"
        variant="secondary"
        onClick={() =>
          certify.mutate(
            { id: claim.id, certifiedAmount: amount, retentionRate },
            { onSuccess: () => setOpen(false) },
          )
        }
        loading={certify.isPending}
      >
        Simpan
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
    </div>
  ) : (
    <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>Sertifikasi</Button>
  );
}

function ClaimForm({ onDone }: { onDone: () => void }) {
  const [projectId, setProjectId] = useState('');
  const [period, setPeriod] = useState('');
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [workPackageId, setWorkPackageId] = useState('');
  const [billableProgress, setBillableProgress] = useState('');
  const projects = useProjects({ page: 1, pageSize: 100 });
  const { data: workPackages } = useWorkPackages(projectId, { page: 1, pageSize: 100 });
  const create = useCreateProgressClaim();

  const selectedWp = workPackages?.items.find((w) => w.id === workPackageId);

  const onSubmit = () => {
    if (!projectId || amount <= 0) return;
    create.mutate(
      {
        projectId,
        period: period || undefined,
        amount,
        description: description || undefined,
        workPackageId: workPackageId || undefined,
        physicalProgressAtClaim: selectedWp?.latestProgress ?? undefined,
        billableProgress: billableProgress ? Number(billableProgress) : undefined,
      },
      { onSuccess: () => { setPeriod(''); setAmount(0); setDescription(''); setWorkPackageId(''); setBillableProgress(''); onDone(); } },
    );
  };

  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="clm-project">Project</Label>
          <select
            id="clm-project"
            value={projectId}
            onChange={(e) => { setProjectId(e.target.value); setWorkPackageId(''); }}
            className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="">Pilih project…</option>
            {(projects.data?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="clm-period">Periode</Label>
          <Input id="clm-period" placeholder="mis. 2026-08" value={period} onChange={(e) => setPeriod(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="clm-wp">Work Package (basis klaim)</Label>
          <select
            id="clm-wp"
            value={workPackageId}
            onChange={(e) => setWorkPackageId(e.target.value)}
            disabled={!projectId}
            className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20 disabled:bg-neutral-50"
          >
            <option value="">Tanpa work package</option>
            {(workPackages?.items ?? []).map((w) => (
              <option key={w.id} value={w.id}>{w.wpNumber} — {w.title} ({w.latestProgress ?? 0}%)</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="clm-billable">Billable Progress (%)</Label>
          <Input
            id="clm-billable"
            type="number"
            min={0}
            max={100}
            placeholder={selectedWp ? `Fisik saat ini: ${selectedWp.latestProgress ?? 0}%` : 'Opsional'}
            value={billableProgress}
            onChange={(e) => setBillableProgress(e.target.value)}
            disabled={!selectedWp}
          />
        </div>
        <div>
          <Label htmlFor="clm-amount">Nilai Klaim</Label>
          <Input id="clm-amount" type="number" min={0} step={100000} value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} />
        </div>
        <div>
          <Label htmlFor="clm-desc">Deskripsi</Label>
          <Input id="clm-desc" placeholder="Progres pekerjaan…" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="button" onClick={onSubmit} loading={create.isPending}>Buat Klaim DRAFT</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal membuat klaim.</p>}
    </div>
  );
}

export function ProgressClaimPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading, isError, refetch } = useProgressClaims({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Progress Claim</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Klaim progres pekerjaan ke klien (FR-FIN-008)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Tutup' : '+ Buat Klaim'}
        </Button>
      </div>

      {showForm && <ClaimForm onDone={() => setShowForm(false)} />}

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
          emptyMessage="Belum ada claim"
        />
      </div>
    </div>
  );
}
