import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { ConfirmDialog, useToast } from '@aec/ui';
import { useApprovalDetail, useApprovalQueue, useBulkDecideApproval, useDecideApproval } from '@/features/approval';
import { ApprovalBulkBar, ApprovalDetail, ApprovalFilters, ApprovalQueue, RejectDialog } from '@/features/approval/ui';
import { OVERDUE_DAYS } from '@/features/approval/lib/aging';
import { useUrlFilter } from '@/shared/lib/use-url-state';
import { PAGE_SIZE } from '@/shared/lib/pagination';

/**
 * Inbox approval (master–detail). Kiri = antrean yang bisa disaring, kanan = bukti
 * dokumen + keputusan. Semua filter tersimpan di URL agar bisa dibagikan.
 */
export function ApprovalPage() {
  const [status, setStatus] = useUrlFilter('status', 'PENDING');
  const [type, setType] = useUrlFilter('type');
  const [query, setQuery] = useUrlFilter('q');
  const [mineRaw, setMineRaw] = useUrlFilter('mine');
  const mine = mineRaw === '1';
  const [selectedId, setSelectedId] = useUrlFilter('task');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [now] = useState(() => Date.now());

  const toast = useToast();
  const decide = useDecideApproval();
  const bulk = useBulkDecideApproval();

  const queue = useApprovalQueue({ status, type, q: query, mine, page: 1, pageSize: PAGE_SIZE });
  const detail = useApprovalDetail(selectedId || null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkApproveOpen, setBulkApproveOpen] = useState(false);

  const items = useMemo(() => queue.data?.items ?? [], [queue.data]);
  const counts = queue.data?.counts ?? { PENDING: 0, APPROVED: 0, REJECTED: 0, ALL: 0 };
  const overdueCount = useMemo(
    () => items.filter((i) => i.status === 'PENDING' && (now - new Date(i.createdAt).getTime()) / 86_400_000 >= OVERDUE_DAYS).length,
    [items, now],
  );
  const canApproveCount = items.filter((i) => i.canApprove).length;
  const hasFilter = Boolean(type || query || mine || status !== 'PENDING');

  const clearFilters = () => {
    setStatus('PENDING');
    setType('');
    setQuery('');
    setMineRaw('');
  };

  const toggleCheck = (id: string) =>
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const clearSelection = () => setCheckedIds(new Set());

  const target = selectedId ? detail.data?.document.code ?? selectedId : '';

  const approveSelected = () => {
    if (!selectedId) return;
    decide.mutate(
      { taskId: selectedId, decision: 'APPROVE' },
      {
        onSuccess: () => {
          toast({ title: 'Request approved', description: target || undefined, variant: 'success' });
          setConfirmOpen(false);
          clearSelection();
        },
        onError: () => toast({ title: 'Failed to approve', description: 'The request may have changed.', variant: 'error' }),
      },
    );
  };

  const rejectSelected = (reason: string) => {
    if (!selectedId) return;
    decide.mutate(
      { taskId: selectedId, decision: 'REJECT', comment: reason },
      {
        onSuccess: () => {
          toast({ title: 'Request rejected', description: target || undefined, variant: 'info' });
          setRejectOpen(false);
          clearSelection();
        },
        onError: () => toast({ title: 'Failed to reject', description: 'The request may have changed.', variant: 'error' }),
      },
    );
  };

  const bulkApprove = () => {
    bulk.mutate(
      { taskIds: [...checkedIds], decision: 'APPROVE' },
      {
        onSuccess: (res: unknown) => {
          const r = res as { succeeded: number; failed: number } | undefined;
          const ok = r?.succeeded ?? checkedIds.size;
          const failed = r?.failed ?? 0;
          toast({
            title: failed > 0 ? `Approved ${ok}, ${failed} skipped` : `Approved ${ok} requests`,
            description: failed > 0 ? 'Some requests were no longer eligible and were not approved.' : undefined,
            variant: failed > 0 ? 'error' : 'success',
          });
          setBulkApproveOpen(false);
          clearSelection();
        },
        onError: () => toast({ title: 'Bulk approve failed', variant: 'error' }),
      },
    );
  };

  const bulkReject = (reason: string) => {
    bulk.mutate(
      { taskIds: [...checkedIds], decision: 'REJECT', comment: reason },
      {
        onSuccess: (res: unknown) => {
          const r = res as { succeeded: number; failed: number } | undefined;
          const ok = r?.succeeded ?? checkedIds.size;
          const failed = r?.failed ?? 0;
          toast({
            title: failed > 0 ? `Rejected ${ok}, ${failed} skipped` : `Rejected ${ok} requests`,
            variant: failed > 0 ? 'error' : 'info',
          });
          setBulkRejectOpen(false);
          clearSelection();
        },
        onError: () => toast({ title: 'Bulk reject failed', variant: 'error' }),
      },
    );
  };

  return (
    <div className="mx-auto flex h-full max-w-[1400px] flex-col">
      <header className="mb-4">
        <h1 className="text-h1 text-neutral-950">Approval</h1>
        <p className="mt-1 text-body-sm text-neutral-500">Approval inbox · review and decide purchase requests and orders</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm" data-testid="approval-summary">
          <span className="inline-flex items-center gap-1.5 text-neutral-700">
            <Clock className="h-4 w-4 text-neutral-400" aria-hidden="true" />
            <span className="font-mono tabular-nums">{counts.PENDING}</span> awaiting your decision
          </span>
          <span className={`inline-flex items-center gap-1.5 ${overdueCount > 0 ? 'text-destructive-600' : 'text-neutral-700'}`}>
            <AlertTriangle className={`h-4 w-4 ${overdueCount > 0 ? 'text-destructive-500' : 'text-neutral-400'}`} aria-hidden="true" />
            <span className="font-mono tabular-nums">{overdueCount}</span> overdue
          </span>
          <span className="inline-flex items-center gap-1.5 text-neutral-700">
            <CheckCircle2 className="h-4 w-4 text-neutral-400" aria-hidden="true" />
            <span className="font-mono tabular-nums">{canApproveCount}</span> you can approve
          </span>
        </div>
      </header>

      <ApprovalFilters
        status={status}
        type={type}
        query={query}
        mine={mine}
        counts={counts}
        onStatus={(v) => {
          setStatus(v);
          clearSelection();
        }}
        onType={setType}
        onQuery={setQuery}
        onMine={(v) => setMineRaw(v ? '1' : '')}
      />

      <div className="mt-3 grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[380px_1fr]">
        {/* Antrean — di mobile tampil penuh, detail menggantikan saat task dipilih. */}
        <section
          aria-label="Approval queue"
          className={`flex min-h-[320px] flex-col rounded-md border border-neutral-200 bg-white shadow-xs ${
            selectedId ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <ApprovalBulkBar
            count={checkedIds.size}
            busy={bulk.isPending}
            onApprove={() => setBulkApproveOpen(true)}
            onReject={() => setBulkRejectOpen(true)}
            onClear={clearSelection}
          />
          <div className="flex-1 overflow-y-auto">
            <ApprovalQueue
              items={items}
              total={queue.data?.total ?? 0}
              isLoading={queue.isLoading}
              isError={queue.isError}
              hasFilter={hasFilter}
              selectedId={selectedId || null}
              checkedIds={checkedIds}
              now={now}
              onSelect={setSelectedId}
              onToggleCheck={toggleCheck}
              onClearFilters={clearFilters}
              onRetry={() => queue.refetch()}
            />
          </div>
        </section>

        {/* Detail — di mobile hanya tampil setelah memilih task. */}
        <section
          aria-label="Task detail"
          className={`min-h-[320px] rounded-md border border-neutral-200 bg-white shadow-xs ${
            selectedId ? 'flex flex-col' : 'hidden lg:flex'
          }`}
        >
          {!selectedId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-1 p-8 text-center">
              <p className="text-body font-medium text-neutral-700">Select a task to review</p>
              <p className="text-body-sm text-neutral-500">Amount, project, vendor, and items appear here before you decide.</p>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="border-b border-neutral-200 px-4 py-2 text-left text-body-sm text-neutral-600 lg:hidden"
                onClick={() => setSelectedId('')}
              >
                ← Back to queue
              </button>
              <ApprovalDetail
                data={detail.data}
                isLoading={detail.isLoading}
                isError={detail.isError}
                canApprove={detail.data?.task.canApprove ?? false}
                onApprove={() => setConfirmOpen(true)}
                onReject={() => setRejectOpen(true)}
                onRetry={() => detail.refetch()}
              />
            </>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Approve this request?"
        description={target ? `${target} will be approved.` : undefined}
        confirmLabel="Approve"
        loading={decide.isPending}
        onConfirm={approveSelected}
      />

      <RejectDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        target={target ? `Reject ${target}? This will send it back to the requester.` : ''}
        loading={decide.isPending}
        onConfirm={rejectSelected}
      />

      <ConfirmDialog
        open={bulkApproveOpen}
        onOpenChange={setBulkApproveOpen}
        title={`Approve ${checkedIds.size} request${checkedIds.size === 1 ? '' : 's'}?`}
        description="Each request is re-checked before approval. Any that are no longer eligible will be skipped."
        confirmLabel="Approve selected"
        loading={bulk.isPending}
        onConfirm={bulkApprove}
      />

      <RejectDialog
        open={bulkRejectOpen}
        onOpenChange={setBulkRejectOpen}
        target={`Reject ${checkedIds.size} selected request${checkedIds.size === 1 ? '' : 's'}?`}
        loading={bulk.isPending}
        onConfirm={bulkReject}
      />
    </div>
  );
}
