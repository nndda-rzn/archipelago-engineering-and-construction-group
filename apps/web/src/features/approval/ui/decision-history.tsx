import type { ApprovalHistoryEntry } from '@aec/api-contracts';
import { labelAction } from '@aec/ui';
import { formatDateTime } from '@/shared/lib/format';

/**
 * Jejak keputusan sebagai timeline. Menjawab "apa yang sudah terjadi dan oleh
 * siapa" — penting untuk audit dan agar approver tahu ini penolakan ulang.
 */
export function DecisionHistory({ history }: { history: ApprovalHistoryEntry[] }) {
  if (history.length === 0) {
    return <p className="text-body-sm text-neutral-500">No decisions recorded yet.</p>;
  }
  return (
    <ol className="relative space-y-3 border-l border-neutral-200 pl-4">
      {history.map((entry, i) => (
        <li key={`${entry.action}-${entry.at}-${i}`} className="relative">
          <span
            aria-hidden="true"
            className={`absolute -left-[21px] top-1.5 h-2 w-2 rounded-full ${
              entry.action.endsWith('REJECT') ? 'bg-destructive-500' : entry.action.endsWith('APPROVE') ? 'bg-success-500' : 'bg-neutral-400'
            }`}
          />
          <p className="text-body-sm text-neutral-800">{labelAction(entry.action)}</p>
          <p className="text-caption text-neutral-500">
            {entry.actorName ?? entry.actorId} · <time dateTime={entry.at}>{formatDateTime(entry.at)}</time>
          </p>
          {entry.comment && <p className="mt-0.5 text-body-sm text-neutral-600">“{entry.comment}”</p>}
        </li>
      ))}
    </ol>
  );
}
