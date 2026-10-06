import { Badge, BulletBar, EmptyState, EntityAvatar, ErrorState, Skeleton, StatusBadge, type BarTone } from '@aec/ui';
import { CheckCircle2, Inbox } from 'lucide-react';
import type { ApprovalQueueItem } from '@aec/api-contracts';
import { agingFrom, agingLabel, type AgingLevel } from '../lib/aging';
import { formatIdr } from '@/shared/lib/format';

const TYPE_LABEL: Record<string, string> = { PurchaseRequisition: 'PR', PurchaseOrder: 'PO' };

/** Warna bar mengikuti urgensi — tapi teks labelnya yang menjadi sinyal utama. */
const LEVEL_TONE: Record<AgingLevel, BarTone> = { ok: 'neutral', 'due-soon': 'warning', overdue: 'destructive' };

export interface ApprovalQueueProps {
  items: ApprovalQueueItem[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  hasFilter: boolean;
  selectedId: string | null;
  checkedIds: Set<string>;
  now: number;
  onSelect: (id: string) => void;
  onToggleCheck: (id: string) => void;
  onClearFilters: () => void;
  onRetry: () => void;
}

function QueueRow({
  item,
  active,
  checked,
  now,
  onSelect,
  onToggleCheck,
}: {
  item: ApprovalQueueItem;
  active: boolean;
  checked: boolean;
  now: number;
  onSelect: (id: string) => void;
  onToggleCheck: (id: string) => void;
}) {
  const aging = agingFrom(item.createdAt, new Date(now));
  const label = agingLabel(aging);
  const code = item.transactionCode ?? item.transactionId;

  return (
    <li>
      <div
        className={`flex gap-2.5 border-b border-neutral-100 px-3 py-2.5 transition-colors duration-fast ${
          active ? 'bg-neutral-100' : 'hover:bg-neutral-50'
        }`}
      >
        {/* Bar kiri menandai baris aktif secara netral (merah bukan penanda "terpilih"). */}
        <span aria-hidden="true" className={`-my-2.5 w-0.5 shrink-0 rounded-full ${active ? 'bg-neutral-800' : 'bg-transparent'}`} />
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0 rounded border-neutral-300 text-neutral-800 focus-visible:ring-2 focus-visible:ring-neutral-800"
          checked={checked}
          onChange={() => onToggleCheck(item.id)}
          aria-label={`Select ${code}`}
        />
        <button
          type="button"
          onClick={() => onSelect(item.id)}
          aria-current={active ? 'true' : undefined}
          className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-800 focus-visible:ring-offset-1"
        >
          <div className="flex items-center gap-2">
            <span className="truncate font-mono text-body-sm text-neutral-900">{code}</span>
            <Badge variant="default">{TYPE_LABEL[item.transactionType] ?? item.transactionType}</Badge>
            {item.status !== 'PENDING' && <StatusBadge status={item.status} size={11} />}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-caption text-neutral-500">
            <EntityAvatar name={item.requesterName ?? '—'} size="md" className="h-5 w-5 text-[9px]" />
            <span className="truncate">{item.requesterName ?? 'Unknown requester'}</span>
            {item.projectCode && <span className="truncate text-neutral-400">· {item.projectCode}</span>}
          </div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <span className="font-mono text-body-sm tabular-nums text-neutral-800">
              {item.amount != null ? formatIdr(item.amount) : '—'}
            </span>
            <span className={`text-caption ${aging.level === 'overdue' ? 'text-destructive-600' : aging.level === 'due-soon' ? 'text-warning-700' : 'text-neutral-500'}`}>
              {label}
            </span>
          </div>
          <BulletBar value={aging.ratio * 100} max={100} label={`Waiting ${aging.days} days`} tone={LEVEL_TONE[aging.level]} className="mt-1.5 h-1" />
        </button>
      </div>
    </li>
  );
}

export function ApprovalQueue({
  items,
  total,
  isLoading,
  isError,
  hasFilter,
  selectedId,
  checkedIds,
  now,
  onSelect,
  onToggleCheck,
  onClearFilters,
  onRetry,
}: ApprovalQueueProps) {
  if (isLoading) {
    return (
      <div aria-label="Loading tasks" className="space-y-2 p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <ErrorState message="Could not load tasks." onRetry={onRetry} />;
  }

  if (items.length === 0) {
    return hasFilter ? (
      <EmptyState
        title="No tasks match"
        description="Your filters returned nothing."
        action={
          <button type="button" className="text-caption text-neutral-600 underline hover:text-neutral-900" onClick={onClearFilters}>
            Clear filters
          </button>
        }
      />
    ) : (
      <EmptyState
        tone="success"
        icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
        title="You're all caught up"
        description="No requests are waiting for your decision."
      />
    );
  }

  return (
    <div>
      <ul className="list-none" aria-label="Approval queue">
        {items.map((item) => (
          <QueueRow
            key={item.id}
            item={item}
            active={item.id === selectedId}
            checked={checkedIds.has(item.id)}
            now={now}
            onSelect={onSelect}
            onToggleCheck={onToggleCheck}
          />
        ))}
      </ul>
      <p className="flex items-center gap-1.5 px-3 py-2 text-caption text-neutral-500">
        <Inbox className="h-3.5 w-3.5" aria-hidden="true" />
        Showing {items.length} of {total}
      </p>
    </div>
  );
}
