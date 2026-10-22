import { formatIdr, formatIdrCompact } from '@/shared/lib/format';

/**
 * Zona 1 — posisi uang proyek.
 *
 * Ini satu-satunya elemen di halaman yang memakai `text-display`. Hierarki harus
 * punya satu pemenang; kalau semua seksi setara, pembaca tidak tahu harus mulai
 * dari mana.
 *
 * Bar dibagi tiga, dan bagian yang KOSONG itu informasi: sisa yang belum
 * terpakai. Karena itu bar tidak pernah digambar penuh.
 *
 * Penanda EAC sengaja boleh jatuh di luar ujung bar. Proyeksi overrun adalah
 * hal yang harus terlihat sebelum angkanya dibaca.
 */
export interface MoneyPositionProps {
  revised: number;
  committed: number;
  actual: number;
  eac: number | null;
  baseline: number;
}

const pct = (value: number, total: number): number => (total > 0 ? Math.min(100, Math.max(0, (value / total) * 100)) : 0);

const round = (n: number): number => Math.round(n * 10) / 10;

export function MoneyPosition({ revised, committed, actual, eac, baseline }: MoneyPositionProps) {
  const remaining = Math.max(0, revised - committed - actual);
  const actualPct = pct(actual, revised);
  const committedPct = pct(committed, revised);
  const remainingPct = pct(remaining, revised);

  // EAC dipetakan ke skala bar. Bila melebihi revised, penanda menempel di ujung
  // kanan dan ditandai overflow supaya tidak menyiratkan "pas".
  const eacOverflow = eac != null && eac > revised;
  const eacPct = eac == null ? null : eacOverflow ? 100 : pct(eac, revised);

  const drift = revised - baseline;
  const hasBar = revised > 0;

  return (
    <section aria-label="Money position" className="border-y border-neutral-300 py-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="text-overline uppercase text-neutral-500">Revised budget</p>
        <p data-testid="money-revised" className="font-mono text-display tabular-nums text-neutral-950">
          {formatIdrCompact(revised)}
        </p>
      </div>

      <div className="relative mt-4">
        {hasBar ? (
          <div
            data-testid="money-bar"
            role="img"
            aria-label={
              `Revised ${formatIdr(revised)}: actual ${formatIdr(actual)} (${round(actualPct)}%), ` +
              `committed ${formatIdr(committed)} (${round(committedPct)}%), ` +
              `remaining ${formatIdr(remaining)} (${round(remainingPct)}%)` +
              (eac == null ? '' : `, EAC ${formatIdr(eac)}`)
            }
            className="flex h-10 w-full overflow-hidden bg-neutral-100"
          >
            {actual > 0 && (
              <span
                data-testid="segment-actual"
                className="flex items-center justify-start overflow-hidden bg-neutral-800 px-2"
                style={{ width: `${actualPct}%` }}
              >
                <span className="whitespace-nowrap font-mono text-caption tabular-nums text-white">
                  {round(actualPct)}%
                </span>
              </span>
            )}
            {committed > 0 && (
              <span
                data-testid="segment-committed"
                className="flex items-center justify-start overflow-hidden bg-neutral-500 px-2"
                style={{ width: `${committedPct}%` }}
              >
                <span className="whitespace-nowrap font-mono text-caption tabular-nums text-white">
                  {round(committedPct)}%
                </span>
              </span>
            )}
            {remaining > 0 && (
              <span
                data-testid="segment-remaining"
                className="flex items-center justify-end overflow-hidden px-2"
                style={{ width: `${remainingPct}%` }}
              >
                <span className="whitespace-nowrap font-mono text-caption tabular-nums text-neutral-600">
                  {round(remainingPct)}%
                </span>
              </span>
            )}
          </div>
        ) : (
          <div data-testid="money-bar" className="h-10 w-full bg-neutral-100" />
        )}

        {eacPct != null && (
          <div
            data-testid="eac-marker"
            data-overflow={eacOverflow ? 'true' : 'false'}
            className="pointer-events-none absolute -top-1 bottom-0"
            style={{ left: `calc(${eacPct}% - 1px)` }}
          >
            <span className={`block h-full w-0.5 ${eacOverflow ? 'bg-destructive-700' : 'bg-neutral-900'}`} />
            <span
              className={`absolute top-full mt-1 whitespace-nowrap font-mono text-caption tabular-nums ${
                eacOverflow ? 'text-destructive-700' : 'text-neutral-700'
              } ${eacOverflow ? 'right-0' : 'left-0'}`}
            >
              EAC {formatIdrCompact(eac!)}
            </span>
          </div>
        )}
      </div>

      <dl className="mt-7 flex flex-wrap gap-x-8 gap-y-2 text-body-sm">
        <div className="flex items-baseline gap-2">
          <dt className="flex items-center gap-1.5 text-neutral-600">
            <span aria-hidden="true" className="inline-block h-2.5 w-2.5 bg-neutral-800" />
            Actual
          </dt>
          <dd className="font-mono tabular-nums text-neutral-900" title={formatIdr(actual)}>{formatIdrCompact(actual)}</dd>
        </div>
        <div className="flex items-baseline gap-2">
          <dt className="flex items-center gap-1.5 text-neutral-600">
            <span aria-hidden="true" className="inline-block h-2.5 w-2.5 bg-neutral-500" />
            Committed
          </dt>
          <dd className="font-mono tabular-nums text-neutral-900" title={formatIdr(committed)}>{formatIdrCompact(committed)}</dd>
        </div>
        <div className="flex items-baseline gap-2">
          <dt className="flex items-center gap-1.5 text-neutral-600">
            <span aria-hidden="true" className="inline-block h-2.5 w-2.5 border border-neutral-300 bg-neutral-100" />
            Remaining
          </dt>
          <dd className="font-mono tabular-nums text-neutral-900" title={formatIdr(remaining)}>{formatIdrCompact(remaining)}</dd>
        </div>
        <div className="flex items-baseline gap-2">
          <dt className="text-neutral-600">Baseline</dt>
          <dd className="font-mono tabular-nums text-neutral-700" title={formatIdr(baseline)}>{formatIdrCompact(baseline)}</dd>
        </div>
      </dl>

      <p data-testid="drift" className="mt-2 text-caption text-neutral-600">
        {drift === 0 ? (
          <>Baseline {formatIdrCompact(baseline)} · drift 0</>
        ) : (
          <>
            Baseline {formatIdrCompact(baseline)} ·{' '}
            <span className={`font-mono tabular-nums ${drift < 0 ? 'text-destructive-700' : 'text-neutral-800'}`}>
              {drift > 0 ? '+' : '−'}{formatIdrCompact(Math.abs(drift))}
            </span>{' '}
            drift vs baseline
          </>
        )}
      </p>

      {hasBar && (
        <p className="mt-1 text-caption text-neutral-500">
          Actual is recorded only against the WBS that received material, so the bar is not expected to fill.
        </p>
      )}
    </section>
  );
}
