import { EmptyState } from '@aec/ui';
import type { ArConcentration } from '@aec/api-contracts';
import { formatIdr } from '@/shared/lib/format';

/**
 * Konsentrasi piutang per klien — **ranking** (horizontal bar tersortir), karena
 * pertanyaannya "siapa yang menahan uang kita", bukan "berapa porsinya dari pie".
 */
export function ConcentrationBars({ data }: { data: ArConcentration }) {
  if (data.items.length === 0 || data.total <= 0) {
    return <EmptyState title="No outstanding receivables" description="Every posted client invoice is settled." />;
  }
  const max = Math.max(...data.items.map((i) => i.amount), 0);

  return (
    <ul className="space-y-2">
      {data.items.map((i) => (
        <li key={i.client} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
          <span className="truncate text-body-sm text-neutral-700">{i.client}</span>
          <span className="text-right font-mono text-body-sm tabular-nums text-neutral-900">{formatIdr(i.amount)}</span>
          <span className="col-span-2 flex items-center gap-2">
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
              <span
                data-slot="concentration-fill"
                className="block h-full rounded-full bg-info-600/70"
                style={{ width: `${max > 0 ? (i.amount / max) * 100 : 0}%` }}
              />
            </span>
            <span className="w-12 shrink-0 text-right font-mono text-caption tabular-nums text-neutral-500">{i.pct}%</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
