import { SegmentRuler, type SegmentRulerSegment } from '@aec/ui';
import { formatIdrCompact } from '@/shared/lib/format';

/**
 * Zona A — indeks.
 *
 * Sebelumnya CPI/SPI hanya muncul DI DALAM tabel penyimpangan, dan hanya kalau
 * nilainya di bawah ambang. Artinya proyek sehat tidak menampilkan indeksnya sama
 * sekali — padahal itu angka pertama yang dicari. Zona ini menjawab "bagaimana
 * posisi proyek ini" sebelum bertanya "apa yang salah".
 *
 * Bentuk: angka raksasa (bukan kartu berbingkai), delta yang menyebut ambangnya,
 * lalu satu sumbu uang bersama BAC vs EAC dengan penanda di posisi AC. Sumbu
 * bersama itu yang membuat "berapa banyak anggaran sudah jadi biaya" terbaca
 * tanpa menghitung.
 */
export interface ControlsIndexProps {
  evm: {
    metrics: {
      cpi: number | null;
      spi: number | null;
      bac: number;
      ev: number;
      ac: number;
      cv?: number;
    } & Record<string, unknown>;
  };
  eac: number | null;
}

interface IndexCell {
  key: string;
  label: string;
  value: string;
  /** Selisih terhadap ambang 1,00, sudah bertanda. */
  delta: string | null;
  bad: boolean;
  note?: string;
}

/** Ambang indeks kinerja: 1,00. Delta dinyatakan relatif terhadapnya. */
const THRESHOLD = 1;

function indexCell(key: string, label: string, v: number | null, note?: string): IndexCell {
  if (v == null) {
    return { key, label, value: '—', delta: null, bad: false, note: 'not computable' };
  }
  const diff = v - THRESHOLD;
  const pct = Math.round(Math.abs(diff / THRESHOLD) * 100);
  return {
    key,
    label,
    value: v.toFixed(2),
    delta: diff === 0 ? 'at threshold' : `${diff > 0 ? '+' : '−'}${pct}% vs 1,00`,
    bad: diff < 0,
    note,
  };
}

export function ControlsIndex({ evm, eac }: ControlsIndexProps) {
  const { cpi, spi, bac } = evm.metrics;
  const ev = evm.metrics.ev;
  const ac = evm.metrics.ac;

  const cells: IndexCell[] = [
    indexCell('cpi', 'Cost performance', cpi, 'CPI'),
    indexCell('spi', 'Schedule performance', spi, 'SPI'),
  ];

  const variance = ev != null && ac != null ? ev - ac : null;
  const varianceCell: IndexCell = {
    key: 'variance',
    label: 'Cost variance',
    value: variance == null ? '—' : formatIdrCompact(variance),
    delta: null,
    bad: variance != null && variance < 0,
    note: variance == null ? 'not computable' : variance < 0 ? 'over cost' : 'under cost',
  };

  // Sumbu uang bersama: 0 → max(BAC, EAC). Segmen BAC selalu ada; EAC hanya bila
  // melebihi BAC, karena EAC di bawah BAC berarti proyeksi lebih murah — itu
  // bukan rentang tambahan, itu kabar baik yang cukup ditulis sebagai angka.
  const scaleMax = Math.max(bac, eac ?? 0, 1);
  const segments: SegmentRulerSegment[] = [{ id: 'bac', label: 'BAC', from: 0, to: bac }];
  const markers: Array<{ from: number; to: number | null }> = [];
  if (ac != null && ac > 0) markers.push({ from: ac, to: null });

  return (
    <section aria-label="Index" className="border-t border-neutral-300">
      <p className="mb-2 mt-2 font-mono text-overline uppercase tracking-[0.12em] text-neutral-500">[ INDEKS ]</p>

      <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-3">
        {[...cells, varianceCell].map((c) => (
          <div key={c.key} className="min-w-0">
            <p className="text-caption uppercase tracking-wide text-neutral-500">{c.label}</p>
            <p className={`mt-0.5 font-mono text-display leading-none tabular-nums ${c.bad ? 'text-destructive-600' : 'text-neutral-950'}`}>
              {c.value}
            </p>
            {c.delta && (
              <p className={`mt-1 font-mono text-caption tabular-nums ${c.bad ? 'text-destructive-600' : 'text-neutral-600'}`}>
                {c.delta}
              </p>
            )}
            {c.note && <p className="mt-0.5 text-caption text-neutral-500">{c.note}</p>}
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-neutral-200 pt-3">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-caption text-neutral-500">
          <span>
            Budget at completion <span className="font-mono tabular-nums text-neutral-900">{formatIdrCompact(bac)}</span>
          </span>
          {eac != null && (
            <span>
              Forecast at completion{' '}
              <span className={`font-mono tabular-nums ${eac > bac ? 'text-destructive-600' : 'text-neutral-900'}`}>
                {formatIdrCompact(eac)}
              </span>
            </span>
          )}
          {ac != null && (
            <span>
              Actual cost <span className="font-mono tabular-nums text-neutral-900">{formatIdrCompact(ac)}</span>
            </span>
          )}
        </div>
        <SegmentRuler
          className="mt-2"
          domain={[0, scaleMax]}
          segments={segments}
          markers={markers}
          format={formatIdrCompact}
        />
        <p className="mt-1 text-caption text-neutral-500">
          Scale 0 – {formatIdrCompact(scaleMax)} · vertical marker = actual cost
        </p>
      </div>
    </section>
  );
}

