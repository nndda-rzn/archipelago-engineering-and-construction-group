import { useState } from 'react';
import { ErrorState } from '@aec/ui';
import { useHealthPortfolio } from '@/features/project';
import { HealthBands, HealthCountStrip, HealthMap, HealthRail } from '@/features/project/ui';

/**
 * Project Health — portofolio, bukan satu proyek.
 *
 * Susunan mengikuti cara membaca portofolio, bukan cara menyusun tabel:
 *   1. lima pita dimensi  (bagaimana keadaan portofolio)
 *   2. peta CPI x SPI     (mana yang bermasalah — elemen dominan)
 *   3. rail               (apa yang dikerjakan / mengapa proyek itu)
 *   4. count strip        (berapa tepatnya, tabel di balik tombol)
 *
 * Tidak ada h1 generik + subtitle: judulnya adalah cakupan portofolio itu
 * sendiri. Tabel tidak ada dalam komposisi sampai diminta.
 */
export function ProjectHealthPage() {
  const { data, isLoading, isError, refetch } = useHealthPortfolio();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = data?.items.find((i) => i.projectId === selectedId) ?? null;
  const today = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date());

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-neutral-300 pb-3">
        <h1 className="text-h2 font-light tracking-tight text-neutral-950">Portfolio health</h1>
        <p className="text-caption uppercase tracking-wide text-neutral-900/40">
          {data ? `${data.items.length} projects` : '—'} · {today}
        </p>
      </header>

      {isLoading && (
        <div aria-busy="true" className="mt-6 space-y-6">
          <div className="h-[168px] animate-pulse bg-neutral-100" />
          <div className="h-[432px] animate-pulse bg-neutral-100" />
        </div>
      )}

      {isError && (
        <div className="mt-6">
          <ErrorState message="Failed to load portfolio health." onRetry={() => refetch()} />
        </div>
      )}

      {data && (
        <div className="mt-6 space-y-8">
          <HealthBands items={data.items} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="min-w-0 lg:col-span-8">
              <HealthMap items={data.items} selectedId={selectedId} onSelect={setSelectedId} />
            </div>
            <div className="min-w-0 lg:col-span-4">
              <HealthRail items={data.items} selected={selected} onClear={() => setSelectedId(null)} />
            </div>
          </div>

          <HealthCountStrip data={data} />
        </div>
      )}
    </div>
  );
}
