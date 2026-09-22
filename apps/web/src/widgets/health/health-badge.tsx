import { useHealth } from '@/entities/health';

export function HealthBadge() {
  const { data, isLoading, isError, refetch } = useHealth();

  if (isLoading) {
    return <span className="text-sm text-neutral-500">Memeriksa API…</span>;
  }

  if (isError || !data) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="inline-block h-2 w-2 rounded-full bg-semantic-destructive" />
        <span className="text-semantic-destructive">API tidak tersedia</span>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-100"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <span className="flex items-center gap-2 text-sm text-neutral-700">
      <span className="inline-block h-2 w-2 rounded-full bg-semantic-success" />
      API sehat
      <span className="text-xs text-neutral-500">
        v{data.version} · {new Date(data.timestamp).toLocaleTimeString('id-ID')}
      </span>
    </span>
  );
}
