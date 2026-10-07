import { cn } from '@aec/ui';

export interface LiveIndicatorProps {
  connected: boolean;
  /** Waktu perubahan terakhir (ms epoch) atau null bila belum ada. */
  lastChangeAt: number | null;
  /** Tick untuk memaksa render ulang "updated Ns ago" (dari hook pemanggil). */
  now: number;
  className?: string;
}

/** Format "updated Ns ago" dari selisih waktu. */
export function updatedAgo(lastChangeAt: number | null, now: number): string {
  if (lastChangeAt == null) return 'live';
  const secs = Math.max(0, Math.round((now - lastChangeAt) / 1000));
  if (secs < 5) return 'updated just now';
  if (secs < 60) return `updated ${secs}s ago`;
  const mins = Math.floor(secs / 60);
  return `updated ${mins}m ago`;
}

/**
 * Indikator LIVE: titik berdenyut + teks "updated Ns ago". Titik memakai
 * `animate-pulse` dan berubah abu saat terputus. Teks memberi makna non-warna.
 */
export function LiveIndicator({ connected, lastChangeAt, now, className }: LiveIndicatorProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-caption', connected ? 'text-success-700' : 'text-neutral-500', className)}>
      <span
        aria-hidden="true"
        className={cn('inline-block h-1.5 w-1.5 rounded-full', connected ? 'animate-pulse bg-success-700' : 'bg-neutral-400')}
      />
      {connected ? updatedAgo(lastChangeAt, now) : 'offline'}
    </span>
  );
}
