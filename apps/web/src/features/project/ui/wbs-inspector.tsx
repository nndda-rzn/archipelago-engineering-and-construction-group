import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight, CalendarRange, Diamond, Trash2 } from 'lucide-react';
import { Button, ConfirmDialog, ICON_SIZE, ICON_STROKE, Input, Label } from '@aec/ui';
import type { WbsItem } from '@aec/api-contracts';
import { useDeleteWbsItem, useUpdateWbsItem, useWbsLinks } from '@/entities/wbs';
import { Money } from '@/shared/ui/money';
import { ApiError } from '@/shared/lib/http';

/** Halaman domain tempat jenis dokumen tertaut bisa dibuka. */
const LINK_HREF: Record<string, string> = {
  budgetItems: '/budget',
  requisitions: '/purchase-requisitions',
  poItems: '/purchase-orders',
  goodsReceiptItems: '/goods-receipts',
  stockLedgerEntries: '/stock-ledger',
  materialIssueItems: '/material-issues',
  adjustmentItems: '/stock-adjustments',
  opnameItems: '/stock-opnames',
  transferItems: '/stock-transfers',
  journalLines: '/finance/journals',
  rfqItems: '/rfqs',
  workPackages: '/work-packages',
  timesheets: '/timesheets',
  costCodes: '/project-controls',
  controlAccounts: '/project-controls',
};

function toDateInput(value: string | null): string {
  return value ? value.slice(0, 10) : '';
}

/**
 * Inspector WBS — panel kanan: nilai yang **diisi user** (progress, tanggal,
 * owner, deskripsi, milestone) terpisah dari **rollup read-only** (dihitung
 * server dari anak) dan **dokumen tertaut**. Hapus dijaga: 409 `WBS_HAS_LINKS`
 * ditampilkan jujur beserta jumlah dokumen yang menghalangi.
 */
export function WbsInspector({ projectId, item, onDeleted }: { projectId: string; item: WbsItem; onDeleted: () => void }) {
  const update = useUpdateWbsItem(projectId);
  const remove = useDeleteWbsItem(projectId);
  const links = useWbsLinks(projectId, item.id);

  const [progress, setProgress] = useState(item.progressPercent);
  const [plannedStart, setPlannedStart] = useState(toDateInput(item.plannedStart));
  const [plannedEnd, setPlannedEnd] = useState(toDateInput(item.plannedEnd));
  const [owner, setOwner] = useState(item.responsibleManager ?? '');
  const [description, setDescription] = useState(item.description ?? '');
  const [milestone, setMilestone] = useState(item.isMilestone);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Ganti node terpilih → muat ulang nilai form.
  useEffect(() => {
    setProgress(item.progressPercent);
    setPlannedStart(toDateInput(item.plannedStart));
    setPlannedEnd(toDateInput(item.plannedEnd));
    setOwner(item.responsibleManager ?? '');
    setDescription(item.description ?? '');
    setMilestone(item.isMilestone);
  }, [item]);

  const save = () => {
    update.mutate({
      itemId: item.id,
      input: {
        progressPercent: progress,
        plannedStart: plannedStart || null,
        plannedEnd: plannedEnd || null,
        responsibleManager: owner || null,
        description: description || null,
        isMilestone: milestone,
      },
    });
  };

  const deleteError = remove.error instanceof ApiError && remove.error.code === 'WBS_HAS_LINKS' ? remove.error : null;
  const hasChildren = item.rollup.childCount > 0;

  return (
    <aside aria-label="WBS item detail" className="flex flex-col gap-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-caption text-neutral-500">{item.code}</p>
          <h2 className="truncate text-h3 text-neutral-950" title={item.name}>{item.name}</h2>
        </div>
        {item.isMilestone && (
          <Diamond size={ICON_SIZE.md} strokeWidth={ICON_STROKE} className="mt-1 shrink-0 text-warning-600" aria-label="Milestone" role="img" />
        )}
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label htmlFor="wbs-progress">Progress %</Label>
          <div className="flex items-center gap-3">
            <input
              id="wbs-progress-range"
              type="range"
              min={0}
              max={100}
              value={progress}
              aria-label="Progress slider"
              onChange={(e) => setProgress(Number(e.target.value))}
              className="h-1.5 flex-1 accent-racing-red-600"
            />
            <Input
              id="wbs-progress"
              type="number"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(Math.max(0, Math.min(100, Number(e.target.value))))}
              className="w-20"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="wbs-start">Planned start</Label>
          <Input id="wbs-start" type="date" value={plannedStart} onChange={(e) => setPlannedStart(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="wbs-end">Planned end</Label>
          <Input id="wbs-end" type="date" value={plannedEnd} onChange={(e) => setPlannedEnd(e.target.value)} />
        </div>

        <div className="col-span-2">
          <Label htmlFor="wbs-owner">Responsible manager</Label>
          <Input id="wbs-owner" value={owner} placeholder="e.g. Ahmad Fauzi" onChange={(e) => setOwner(e.target.value)} />
        </div>

        <div className="col-span-2">
          <Label htmlFor="wbs-desc">Description</Label>
          <textarea
            id="wbs-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-body-sm text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing-red-600/40"
          />
        </div>

        <label className="col-span-2 flex items-center gap-2 text-body-sm text-neutral-700">
          <input type="checkbox" checked={milestone} onChange={(e) => setMilestone(e.target.checked)} className="h-4 w-4 rounded border-neutral-300" />
          Milestone
        </label>
      </div>

      {hasChildren && (
        <p className="text-caption text-neutral-500">
          This item has {item.rollup.childCount} child{item.rollup.childCount > 1 ? 'ren' : ''}; the rollup below is computed from them.
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button size="sm" onClick={save} loading={update.isPending}>Save</Button>
      </div>
      {update.isError && <p className="text-caption text-destructive-600">Failed to save. Try again.</p>}

      <section aria-label="Rollup" className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
        <h3 className="mb-2 text-overline uppercase text-neutral-500">Rollup · read-only</h3>
        <dl className="grid grid-cols-3 gap-2 text-body-sm">
          <div>
            <dt className="text-caption text-neutral-500">Budget</dt>
            <dd className="font-mono tabular-nums text-neutral-900"><Money value={item.rollup.budget} /></dd>
          </div>
          <div>
            <dt className="text-caption text-neutral-500">Actual</dt>
            <dd className="font-mono tabular-nums text-neutral-900"><Money value={item.rollup.actual} /></dd>
          </div>
          <div>
            <dt className="text-caption text-neutral-500">Progress</dt>
            <dd className="font-mono tabular-nums text-neutral-900">
              {item.rollup.progress == null ? '—' : `${Math.round(item.rollup.progress)}%`}
            </dd>
          </div>
        </dl>
      </section>

      <section aria-label="Linked documents">
        <h3 className="mb-2 text-overline uppercase text-neutral-500">Linked documents</h3>
        {links.isLoading ? (
          <p className="text-body-sm text-neutral-400">Loading…</p>
        ) : links.isError ? (
          <p className="text-body-sm text-neutral-400">Could not load linked documents.</p>
        ) : links.data && links.data.total > 0 ? (
          <ul className="flex flex-col gap-1">
            {links.data.links.map((l) => {
              const href = LINK_HREF[l.key];
              return (
                <li key={l.key} className="flex items-center justify-between gap-2 text-body-sm">
                  <span className="min-w-0 truncate text-neutral-700">{l.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono tabular-nums text-neutral-900">{l.count}</span>
                    {href && (
                      <Link to={href} className="text-neutral-400 hover:text-neutral-700" aria-label={`Open ${l.label}`}>
                        <ArrowUpRight size={ICON_SIZE.sm} strokeWidth={ICON_STROKE} aria-hidden="true" />
                      </Link>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-body-sm text-neutral-400">No documents reference this item.</p>
        )}
      </section>

      <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
        <span className="flex items-center gap-1 text-caption text-neutral-400">
          <CalendarRange size={ICON_SIZE.sm} strokeWidth={ICON_STROKE} aria-hidden="true" />
          {plannedStart || plannedEnd ? `${plannedStart || '…'} → ${plannedEnd || '…'}` : 'No dates set'}
        </span>
        <Button size="sm" variant="destructive" onClick={() => setConfirmOpen(true)}>
          <Trash2 size={ICON_SIZE.sm} strokeWidth={ICON_STROKE} aria-hidden="true" /> Delete
        </Button>
      </div>

      {deleteError && (
        <p role="alert" className="text-caption text-destructive-600">
          Cannot delete — {deleteError.message}
          {deleteError.details ? ` (${Object.entries(deleteError.details as Record<string, number>).map(([k, v]) => `${v} ${k}`).join(', ')})` : ''}
        </p>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this WBS item?"
        description={hasChildren ? 'Its descendants will be removed too. This cannot be undone.' : 'This cannot be undone.'}
        confirmLabel="Delete"
        variant="destructive"
        loading={remove.isPending}
        onConfirm={() => remove.mutate(item.id, { onSuccess: onDeleted })}
      />
    </aside>
  );
}
