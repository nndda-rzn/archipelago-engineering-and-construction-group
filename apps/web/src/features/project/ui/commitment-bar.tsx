import { formatIdr } from '@/shared/lib/format';

/** Bar komitmen: PO + Subcontract di dalam Budget (relasi kontainmen). */
export function CommitmentBar({ po, subcontract, budget, remaining }: { po: number; subcontract: number; budget: number; remaining: number }) {
  const total = Math.max(budget, po + subcontract, 1);
  const pct = (v: number) => (v > 0 ? (v / total) * 100 : 0);
  return (
    <div data-slot="commitment">
      <div role="img" aria-label={`Budget ${formatIdr(budget)}, PO ${formatIdr(po)}, subcontract ${formatIdr(subcontract)}, remaining ${formatIdr(remaining)}`} className="flex h-3 overflow-hidden rounded-sm bg-neutral-100">
        <span className="bg-neutral-800" style={{ width: `${pct(po)}%` }} />
        <span className="bg-neutral-500" style={{ width: `${pct(subcontract)}%` }} />
      </div>
      <dl className="mt-2 space-y-1">
        {[
          { label: 'PO', value: po, dot: 'bg-neutral-800' },
          { label: 'Subcontract', value: subcontract, dot: 'bg-neutral-500' },
          { label: 'Remaining', value: remaining, dot: 'bg-neutral-200' },
        ].map((r) => (
          <div key={r.label} className="flex items-center gap-2 text-caption text-neutral-600">
            <span className={`inline-block h-2 w-2 rounded-full ${r.dot}`} aria-hidden="true" />
            <dt className="w-28">{r.label}</dt>
            <dd className="font-mono tabular-nums text-neutral-800">{formatIdr(r.value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
