import type { RateHistory } from '@aec/api-contracts';
import { DeltaBadge, EmptyState, Sparkline } from '@aec/ui';
import { formatIdr } from '@/shared/lib/format';

/** Riwayat kurs satu pasangan: sparkline tren + delta titik terakhir. */
export function RateHistoryView({ data }: { data: RateHistory }) {
  if (data.points.length === 0) {
    return <EmptyState title="No rate history" description="Record an exchange rate to start the series." />;
  }
  const values = data.points.map((p) => p.rate);
  const last = values[values.length - 1] ?? 0;
  const prev = values.length > 1 ? values[values.length - 2] ?? last : last;
  const pct = prev !== 0 ? Math.round(((last - prev) / Math.abs(prev)) * 1000) / 10 : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <span className="text-neutral-500">
          <Sparkline values={values} label={`${data.rateType} rate history`} width={160} height={32} />
        </span>
        <span className="font-mono text-body tabular-nums text-neutral-900">{formatIdr(last)}</span>
        {pct != null && <DeltaBadge pct={pct} direction={pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat'} />}
      </div>
      <p className="text-caption text-neutral-500">
        {data.points.length} point{data.points.length === 1 ? '' : 's'} · {data.rateType}
      </p>
    </div>
  );
}
