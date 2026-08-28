import { useState } from 'react';
import { Badge, Button, Input, Label, type BadgeVariant } from '@aec/ui';
import { useWbsTree } from '@/entities/wbs';
import { useCreateWorkPackage, useStartWorkPackage, useCompleteWorkPackage, useAddProgress } from '../model/work-package.api';

export function CreateWorkPackageForm({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const [wbsItemId, setWbsItemId] = useState('');
  const [title, setTitle] = useState('');
  const [plannedQty, setPlannedQty] = useState('');
  const [unit, setUnit] = useState('EA');
  const [scope, setScope] = useState('');
  const { data: wbs } = useWbsTree(projectId);
  const create = useCreateWorkPackage(projectId);

  const flatten = (nodes: { id: string; code: string; name: string; children?: unknown[] }[], depth = 0): { id: string; label: string }[] =>
    nodes.flatMap((n) => [{ id: n.id, label: `${'-'.repeat(depth)} ${n.code} ${n.name}` }, ...flatten((n.children ?? []) as never, depth + 1)]);

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
          <select id="wp-wbs" value={wbsItemId} onChange={(e) => setWbsItemId(e.target.value)} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-body-sm">
            <option value="">Pilih WBS...</option>
            {wbs && flatten(wbs).map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
          </select>
        </div>
        <div><Label htmlFor="wp-qty">Qty Rencana</Label><Input id="wp-qty" type="number" value={plannedQty} onChange={(e) => setPlannedQty(e.target.value)} placeholder="120" /></div>
        <div><Label htmlFor="wp-unit">Unit</Label><Input id="wp-unit" value={unit} onChange={(e) => setUnit(e.target.value)} /></div>
        <div className="md:col-span-2"><Label htmlFor="wp-scope">Ruang Lingkup</Label><Input id="wp-scope" value={scope} onChange={(e) => setScope(e.target.value)} placeholder="Opsional" /></div>
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={onDone}>Batal</Button>
        <Button size="sm" onClick={submit} disabled={create.isPending || !wbsItemId || !title || !plannedQty}>
          {create.isPending ? 'Menyimpan...' : 'Buat Work Package'}
        </Button>
      </div>
      {create.isError && <p className="text-body-sm text-destructive-600">Gagal membuat work package.</p>}
    </div>
  );
}

interface ActionsPanelProps {
  projectId: string;
  items: Array<{ id: string; wpNumber: string; title: string; status: string; latestProgress?: number | null }>;
}

type ProgressState = { id: string; open: boolean; value: string; qty: string };

type WorkPackageStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export const statusVariant: Record<WorkPackageStatus, BadgeVariant> = {
  DRAFT: 'default',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'default',
};

export const statusLabel: Record<WorkPackageStatus, string> = {
  DRAFT: 'Draft',
  IN_PROGRESS: 'Berjalan',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

export function WorkPackageActionsPanel({ projectId, items }: ActionsPanelProps) {
  const start = useStartWorkPackage(projectId);
  const complete = useCompleteWorkPackage(projectId);
  const progress = useAddProgress(projectId);
  const [progressState, setProgressState] = useState<ProgressState>({ id: '', open: false, value: '', qty: '' });

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
    <div className="mt-4 rounded-md border border-neutral-200 bg-white p-4">
      <h2 className="text-h3 text-neutral-800">Aksi Work Package</h2>
      <div className="mt-3 space-y-2">
        {items.filter((wp) => wp.status === 'DRAFT' || wp.status === 'IN_PROGRESS').map((wp) => (
          <div key={wp.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-100 px-3 py-2">
            <div>
              <span className="font-mono text-sm text-neutral-600">{wp.wpNumber}</span>
              <span className="ml-2 text-body-sm text-neutral-800">{wp.title}</span>
              <Badge variant={statusVariant[wp.status as WorkPackageStatus]} className="ml-2">{statusLabel[wp.status as WorkPackageStatus]}</Badge>
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
            <div><Label>Progress (%)</Label><Input type="number" min={0} max={100} value={progressState.value} onChange={(e) => setProgressState({ ...progressState, value: e.target.value })} /></div>
            <div><Label>Qty Terukur</Label><Input type="number" min={0} value={progressState.qty} onChange={(e) => setProgressState({ ...progressState, qty: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setProgressState({ id: '', open: false, value: '', qty: '' })}>Batal</Button>
            <Button size="sm" onClick={() => recordProgress(progressState.id)} disabled={progress.isPending}>
              {progress.isPending ? 'Menyimpan...' : 'Simpan Progress'}
            </Button>
          </div>
          {progress.isError && <p className="text-body-sm text-destructive-600">Gagal menyimpan (progress tidak boleh turun).</p>}
        </div>
      )}
    </div>
  );
}
