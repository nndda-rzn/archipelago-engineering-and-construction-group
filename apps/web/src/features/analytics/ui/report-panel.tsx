import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button, EmptyState, ErrorState, Skeleton } from '@aec/ui';

/** Angka besar tanpa bingkai — satu nilai = angka, bukan chart (`ux-designer/18`). */
export function Headline({ label, value, tone, context }: { label: string; value: string; tone?: string; context?: string }) {
  return (
    <div>
      <p className="text-overline uppercase text-neutral-500">{label}</p>
      <p className={`mt-0.5 font-mono tabular-nums text-h1 ${tone ?? 'text-neutral-950'}`}>{value}</p>
      {context && <p className="text-caption text-neutral-500">{context}</p>}
    </div>
  );
}

/** Panel laporan: judul + aksi export opsional. State loading/empty ditangani isinya. */
export function Panel({ title, subtitle, onExport, children, ariaLabel }: { title: string; subtitle?: string; onExport?: () => Promise<void>; children: React.ReactNode; ariaLabel?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <section aria-label={ariaLabel} className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-h2 text-neutral-950">{title}</h2>
          {subtitle && <p className="mt-0.5 text-caption text-neutral-500">{subtitle}</p>}
        </div>
        {onExport && (
          <Button
            size="sm"
            variant="secondary"
            className="no-print shrink-0"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try { await onExport(); } finally { setBusy(false); }
            }}
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            {busy ? 'Preparing…' : 'CSV'}
          </Button>
        )}
      </div>
      {children}
    </section>
  );
}

export function PanelState({ isLoading, isError, onRetry, empty, emptyNode, children }: {
  isLoading: boolean; isError: boolean; onRetry: () => void; empty: boolean; emptyNode?: React.ReactNode; children: React.ReactNode;
}) {
  if (isLoading) return <div aria-label="Loading report"><Skeleton className="h-32 w-full" /></div>;
  if (isError) return <ErrorState message="Could not load this report." onRetry={onRetry} />;
  if (empty) return <>{emptyNode ?? <EmptyState title="No data" description="Nothing to report for this filter." />}</>;
  return <>{children}</>;
}
