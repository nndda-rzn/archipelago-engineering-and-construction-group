import { useEffect, useState } from 'react';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { Clock } from 'lucide-react';
import { cn } from '@aec/ui';
import { formatRelativeTime } from '@/shared/lib/format';

const STALE_MS = 30_000;

export function LastUpdated({ queryKey, className }: { queryKey: readonly unknown[]; className?: string }) {
  const qc = useQueryClient();
  const isFetching = useIsFetching({ queryKey: [...queryKey] });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), STALE_MS);
    return () => window.clearInterval(timer);
  }, []);

  const state = qc.getQueryState([...queryKey]);
  const updatedAt = state?.dataUpdatedAt;
  const isStale = updatedAt ? now - updatedAt > STALE_MS : true;

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-caption text-neutral-500', className)}
      title={updatedAt ? new Date(updatedAt).toLocaleString('id-ID') : undefined}
    >
      <Clock className={cn('h-3 w-3', isFetching > 0 && 'animate-spin')} aria-hidden="true" />
      {isStale ? 'Data mungkin basi' : updatedAt ? `Diperbarui ${formatRelativeTime(new Date(updatedAt))}` : 'Belum dimuat'}
    </span>
  );
}
