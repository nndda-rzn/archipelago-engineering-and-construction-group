import type { DoaAnalysis } from '@aec/api-contracts';
import { EmptyState, StatusPill } from '@aec/ui';
import { formatIdr } from '@/shared/lib/format';

/**
 * Analisis tangga wewenang: daftar tumpang tindih (dua aturan menutupi rentang
 * yang sama) dan celah (nominal yang tidak ditutup aturan mana pun). Severity
 * selalu disertai teks, jadi terbaca tanpa warna.
 */
export function DoaAnalysisPanel({ analysis }: { analysis: DoaAnalysis | undefined }) {
  if (!analysis) {
    return <p className="text-body-sm text-neutral-500">Run an analysis to see overlaps and gaps.</p>;
  }
  if (analysis.overlaps.length === 0 && analysis.gaps.length === 0) {
    return <EmptyState tone="success" title="No overlaps or gaps" description="The authority ladder is fully covered." />;
  }
  return (
    <div className="flex flex-col gap-3">
      {analysis.overlaps.length > 0 && (
        <div>
          <h3 className="mb-1 text-caption uppercase text-neutral-500">Overlaps</h3>
          <ul className="flex flex-col gap-1">
            {analysis.overlaps.map((o, i) => (
              <li key={`${o.aId}-${o.bId}-${i}`} className="flex items-center gap-2 text-body-sm">
                <StatusPill tone="warning" label="overlap" />
                <span className="font-mono text-caption text-neutral-500">{o.aId} ∩ {o.bId}</span>
                <span className="font-mono tabular-nums text-neutral-700">
                  {formatIdr(o.from)} – {o.to == null ? '∞' : formatIdr(o.to)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {analysis.gaps.length > 0 && (
        <div>
          <h3 className="mb-1 text-caption uppercase text-neutral-500">Gaps</h3>
          <ul className="flex flex-col gap-1">
            {analysis.gaps.map((g, i) => (
              <li key={`${g.from}-${g.to}-${i}`} className="flex items-center gap-2 text-body-sm">
                <StatusPill tone="info" label="gap" />
                <span className="font-mono tabular-nums text-neutral-700">
                  {formatIdr(g.from)} – {g.to == null ? '∞' : formatIdr(g.to)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
