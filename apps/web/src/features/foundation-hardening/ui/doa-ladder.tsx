import type { DoaOverlap, DoaRule } from '@aec/api-contracts';
import { SegmentRuler, type SegmentRulerMarker, type SegmentRulerSegment } from '@aec/ui';
import { formatIdr } from '@/shared/lib/format';

export interface DoaLadderProps {
  transactionType: string;
  rules: DoaRule[];
  overlaps: DoaOverlap[];
  /** Nominal hasil simulasi resolve — digambar sebagai penanda posisi. */
  resolvedMarker: number | null;
}

/**
 * "Tangga wewenang" — peta ambang nominal sebuah jenis transaksi: tiap aturan
 * satu segmen pada sumbu nominal bersama, berlabel level approver. Tumpang
 * tindih digambar sebagai penanda (dan didaftarkan terpisah di analisis), jadi
 * bentuknya menjelaskan "siapa menyetujui berapa", bukan tabel angka.
 */
export function DoaLadder({ transactionType, rules, overlaps, resolvedMarker }: DoaLadderProps) {
  const active = rules.filter((r) => r.transactionType === transactionType && r.status === 'ACTIVE');
  if (active.length === 0) {
    return <p className="text-body-sm text-neutral-500">No rules for {transactionType} yet.</p>;
  }

  const segments: SegmentRulerSegment[] = active.map((r) => ({
    id: r.id,
    label: r.approverLevel,
    from: r.amountFrom ?? 0,
    to: r.amountTo ?? null,
  }));

  const numeric = active.flatMap((r) => [r.amountFrom ?? 0, r.amountTo ?? 0]);
  const max = Math.max(1, ...numeric);
  const domain: [number, number] = [0, max];

  const markers: SegmentRulerMarker[] = overlaps.map((o) => ({ from: o.from, to: o.to }));
  if (resolvedMarker != null) markers.push({ from: resolvedMarker, to: resolvedMarker });

  return (
    <div className="flex flex-col gap-2">
      <SegmentRuler domain={domain} segments={segments} markers={markers} format={formatIdr} />
      {overlaps.length > 0 && (
        <p className="text-caption text-warning-700">
          {overlaps.length} overlapping range{overlaps.length === 1 ? '' : 's'} — see analysis below.
        </p>
      )}
      {resolvedMarker != null && (
        <p className="text-caption text-neutral-600">
          Simulated amount <span className="font-mono tabular-nums">{formatIdr(resolvedMarker)}</span> marked on the ladder.
        </p>
      )}
    </div>
  );
}
