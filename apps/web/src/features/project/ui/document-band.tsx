import type { BudgetBaselineSummary } from '@aec/api-contracts';
import { formatIdrCompact } from '@/shared/lib/format';

/**
 * Band dokumen — identitas proyek dan status versi, selebar halaman.
 *
 * Bukan h1 generik + subtitle: judulnya adalah proyek itu sendiri, karena itulah
 * dokumen yang sedang dibaca. Label halaman ("Budget Baseline") sudah diberikan
 * oleh navigasi; mengulanginya sebagai h1 hanya memakan ruang tanpa menambah
 * informasi.
 */
export interface DocumentBandProps {
  projectCode: string;
  projectName: string;
  /** Baris keadaan: ringkasan satu kalimat tentang posisi dokumen. */
  statusLine: string;
  baseline: BudgetBaselineSummary | null;
  previous: BudgetBaselineSummary | null;
  hasOpenRevision: boolean;
  /** Aksi di kanan band; dirender apa adanya agar halaman yang menentukan. */
  actions?: React.ReactNode;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'not frozen';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
}

export function DocumentBand({
  projectCode,
  projectName,
  statusLine,
  baseline,
  previous,
  hasOpenRevision,
  actions,
}: DocumentBandProps) {
  const drift = baseline && previous ? baseline.total - previous.total : null;

  return (
    <header className="border-b-2 border-neutral-300 pb-3">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div className="min-w-0">
          <p className="font-mono text-caption text-neutral-500">{projectCode}</p>
          <h1 className="mt-0.5 truncate text-h2 text-neutral-950">{projectName}</h1>

          <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-caption text-neutral-600">
            <span>{statusLine}</span>
            {baseline && (
              <>
                <span className="text-neutral-300">·</span>
                <span className="font-mono tabular-nums text-neutral-900">v{baseline.version}</span>
                <span className="uppercase">{baseline.status === 'FROZEN' ? 'frozen' : 'draft'}</span>
                <span className="text-neutral-300">·</span>
                <span>{formatDate(baseline.frozenAt)}</span>
                {baseline.label && (
                  <>
                    <span className="text-neutral-300">·</span>
                    <span>{baseline.label}</span>
                  </>
                )}
                {drift != null && (
                  <>
                    <span className="text-neutral-300">·</span>
                    <span
                      className={`font-mono tabular-nums ${drift < 0 ? 'text-destructive-700' : 'text-neutral-700'}`}
                      title={`vs v${previous!.version}`}
                    >
                      {drift > 0 ? '+' : drift < 0 ? '−' : ''}
                      {formatIdrCompact(Math.abs(drift))} vs v{previous!.version}
                    </span>
                  </>
                )}
              </>
            )}
            {hasOpenRevision && (
              <>
                <span className="text-neutral-300">·</span>
                <span className="text-warning-800">revision open</span>
              </>
            )}
          </p>
        </div>

        {actions && <div className="flex flex-wrap items-end gap-2">{actions}</div>}
      </div>
    </header>
  );
}
