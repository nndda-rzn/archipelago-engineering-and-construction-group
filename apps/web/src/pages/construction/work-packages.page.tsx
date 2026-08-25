import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid, Input, Label } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useWbsTree } from '@/entities/wbs';
import { formatIdr } from '@/shared/lib/format';
import {
  useWorkPackages,
  useCreateWorkPackage,
  useStartWorkPackage,
  useCompleteWorkPackage,
  useAddProgress,
  type WorkPackage,
} from '@/features/construction';

const PAGE_SIZE = 20;

const statusVariant: Record<string, 'default' | 'success' | 'warning'> = {
  DRAFT: 'default',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'default',
};

const statusLabel: Record<string, string> = {
  DRAFT: 'Draft',
  IN_PROGRESS: 'Berjalan',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

const columnHelper = createColumnHelper<WorkPackage>();

const columns = [
  columnHelper.accessor('wpNumber', { header: 'Nomor', cell: (info) => <span className="font-mono text-neutral-600">{info.getValue()}</span> }),
  columnHelper.accessor('title', { header: 'Work Package' }),
  columnHelper.accessor('wbs', {
    header: 'WBS',
    cell: (info) => (info.getValue() ? <span className="font-mono text-neutral-600">{info.getValue()?.code}</span> : '—'),
  }),
  columnHelper.accessor('plannedQty', {
    header: 'Qty Rencana',
    cell: (info) => `${info.getValue()} ${info.row.original.unit}`,
  }),
  columnHelper.accessor('latestProgress', {
    header: 'Progress',
    cell: (info) =>
      info.getValue() != null ? (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full rounded-full bg-racing-red-600" style={{ width: `${info.getValue()}%` }} />
          </div>
          <span className="font-mono text-xs tabular-nums text-neutral-700">{info.getValue()}%</span>
        </div>
      ) : (
        <span className="text-neutral-400">—</span>
      ),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{statusLabel[info.getValue()] ?? info.getValue()}</Badge>,
  }),
];

function CreateWorkPackageForm({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const [wbsItemId, setWbsItemId] = useState('');
  const [title, setTitle] = useState('');
  const [plannedQty, setPlannedQty] = useState('');
  const [unit, setUnit] = useState('EA');
  const [scope, setScope] = useState('');
  const { data: wbs } = useWbsTree(projectId);
  const create = useCreateWorkPackage(projectId);

  const flatten = (nodes: { id: string; code: string; name: string; children?: unknown[] }[], depth = 0): { id: string; label: string }[] =>
    nodes.flatMap((n) => [{ id: n.id, label: `${'—'.repeat(depth)} ${n.code} ${n.name}` }, ...flatten((n.children ?? []) as never, depth + 1)]);

  const submit = () => {
    if (!wbsItemId || !title || !plannedQty) return;
    create.mutate(
      { wbsItemId, title, plannedQty: Number(plannedQty), unit, scope: scope || undefined },
      { onSuccess: onDone },
    );
  };

  return (
    <div className="space-y-3 rounded-md border border-neutral-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="wp-title">Judul</Label>
          <Input id="wp-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Pengecoran Fondasi Area A" />
        </div>
        <div>
          <Label htmlFor="wp-wbs">WBS</Label>
          <select
            id="wp-wbs"
            value={wbsItemId}
            onChange={(e) => setWbsItemId(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-body-sm"
          >
            <option value="">Pilih WBS…</option>
            {wbs && flatten(wbs).map((w) => (
              <option key={w.id} value={w.id}>{w.label}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="wp-qty">Qty Rencana</Label>
          <Input id="wp-qty" type="number" value={plannedQty} onChange={(e) => setPlannedQty(e.target.value)} placeholder="120" />
        </div>
        <div>
          <Label htmlFor="wp-unit">Unit</Label>
          <Input id="wp-unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="wp-scope">Ruang Lingkup</Label>
          <Input id="wp-scope" value={scope} onChange={(e) => setScope(e.target.value)} placeholder="Opsional" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={onDone}>Batal</Button>
        <Button size="sm" onClick={submit} disabled={create.isPending || !wbsItemId || !title || !plannedQty}>
          {create.isPending ? 'Menyimpan…' : 'Buat Work Package'}
        </Button>
      </div>
      {create.isError && <p className="text-body-sm text-destructive-600">Gagal membuat work package.</p>}
    </div>
  );
}

export function WorkPackagesPage() {
  const [projectId, setProjectId] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);
  const { data: projects } = useProjects({ page: 1, pageSize: 100 });
  const { data, isLoading, isError, refetch } = useWorkPackages(projectId, { page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const start = useStartWorkPackage(projectId);
  const complete = useCompleteWorkPackage(projectId);
  const progress = useAddProgress(projectId);
  const [progressState, setProgressState] = useState<{ id: string; open: boolean; value: string; qty: string }>({ id: '', open: false, value: '', qty: '' });

  const selectedProject = projects?.items.find((p) => p.id === projectId);

  const recordProgress = (id: string) => {
    const pct = Number(progressState.value);
    const qty = Number(progressState.qty);
    if (isNaN(pct) || pct < 0 || pct > 100 || isNaN(qty)) return;
    progress.mutate(
      { id, input: { physicalProgress: pct, achievedQty: qty, measuredBy: 'admin' } },
      { onSuccess: () => setProgressState({ id: '', open: false, value: '', qty: '' }) },
    );
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Work Packages</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Unit kerja konstruksi — rencana vs progress fisik (FR-CON)</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={projectId}
            onChange={(e) => { setProjectId(e.target.value); setPagination({ pageIndex: 0, pageSize: PAGE_SIZE }); }}
            className="rounded-md border border-neutral-300 px-3 py-2 text-body-sm"
          >
            <option value="">Pilih Project…</option>
            {projects?.items.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
          </select>
          {projectId && <Button size="sm" onClick={() => setShowForm(true)} disabled={showForm}>+ Work Package</Button>}
        </div>
      </div>

      {showForm && projectId && (
        <div className="mb-6">
          <CreateWorkPackageForm projectId={projectId} onDone={() => setShowForm(false)} />
        </div>
      )}

      {!projectId && <p className="text-body-sm text-neutral-500">Pilih project untuk melihat work packages.</p>}

      {projectId && (
        <DataGrid
          columns={columns}
          data={data?.items ?? []}
          rowCount={data?.total ?? 0}
          pagination={pagination}
          onPaginationChange={setPagination}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
        />
      )}

      {data?.items.some((wp) => wp.status === 'IN_PROGRESS' || wp.status === 'DRAFT') && projectId && (
        <div className="mt-4 rounded-md border border-neutral-200 bg-white p-4">
          <h2 className="text-h3 text-neutral-800">Aksi Work Package</h2>
          <div className="mt-3 space-y-2">
            {data.items.filter((wp) => wp.status === 'DRAFT' || wp.status === 'IN_PROGRESS').map((wp) => (
              <div key={wp.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-100 px-3 py-2">
                <div>
                  <span className="font-mono text-sm text-neutral-600">{wp.wpNumber}</span>
                  <span className="ml-2 text-body-sm text-neutral-800">{wp.title}</span>
                  <Badge variant={statusVariant[wp.status] ?? 'default'} className="ml-2">{statusLabel[wp.status] ?? wp.status}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  {wp.status === 'DRAFT' && (
                    <Button size="sm" variant="secondary" onClick={() => start.mutate(wp.id)} disabled={start.isPending}>Mulai</Button>
                  )}
                  {wp.status === 'IN_PROGRESS' && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => setProgressState({ id: wp.id, open: true, value: String(wp.latestProgress ?? 0), qty: '' })}>
                        Catat Progress
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => complete.mutate(wp.id)} disabled={complete.isPending}>Selesaikan</Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {progressState.open && (
            <div className="mt-4 space-y-3 rounded-md border border-neutral-200 bg-neutral-50 p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Progress (%)</Label>
                  <Input type="number" min={0} max={100} value={progressState.value} onChange={(e) => setProgressState({ ...progressState, value: e.target.value })} />
                </div>
                <div>
                  <Label>Qty Terukur</Label>
                  <Input type="number" min={0} value={progressState.qty} onChange={(e) => setProgressState({ ...progressState, qty: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => setProgressState({ id: '', open: false, value: '', qty: '' })}>Batal</Button>
                <Button size="sm" onClick={() => recordProgress(progressState.id)} disabled={progress.isPending}>
                  {progress.isPending ? 'Menyimpan…' : 'Simpan Progress'}
                </Button>
              </div>
              {progress.isError && <p className="text-body-sm text-destructive-600">Gagal menyimpan (progress tidak boleh turun).</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
