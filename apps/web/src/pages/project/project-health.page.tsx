import { useState } from 'react';
import { ErrorState } from '@aec/ui';
import { useHealthPortfolio } from '@/features/project';
import { HealthBands, HealthCountStrip, HealthMap, HealthRail } from '@/features/project/ui';
import { PageHeader, ScopeChip } from '@/widgets/page-header';

/**
 * Project Health — portofolio, bukan satu proyek.
 *
 * Susunan mengikuti cara membaca portofolio, bukan cara menyusun tabel:
 *   1. lima pita dimensi  (bagaimana keadaan portofolio)
 *   2. peta CPI x SPI     (mana yang bermasalah — elemen dominan)
 *   3. rail               (apa yang dikerjakan / mengapa proyek itu)
 *   4. count strip        (berapa tepatnya, tabel di balik tombol)
 *
 * Header memakai `PageHeader` bersama. Sebelumnya halaman ini menulis header
 * sendiri dengan `text-h2 font-light tracking-tight` — lebih kecil dari h1 di
 * seluruh aplikasi — dan metadata `text-neutral-900/40` yang kontrasnya ~2,5:1.
 */
export function ProjectHealthPage() {
  const { data, isLoading, isError, refetch } = useHealthPortfolio();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = data?.items.find((i) => i.projectId === selectedId) ?? null;
  const today = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date());

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      <PageHeader
        title="Portfolio health"
        subtitle="Cost, schedule, quality, safety and risk across the portfolio"
        scope={
          data ? (
            <>
              <ScopeChip mono>{data.items.length} projects</ScopeChip>
              <ScopeChip mono>{today}</ScopeChip>
            </>
          ) : undefined
        }
      />

      {isLoading && (
        <div aria-busy="true" className="space-y-6">
          <div className="h-[168px] animate-pulse bg-neutral-100" />
          <div className="h-[432px] animate-pulse bg-neutral-100" />
        </div>
      )}

      {isError && (
        <ErrorState message="Failed to load portfolio health." onRetry={() => refetch()} />
      )}

      {data && (
        <div className="space-y-8">
          <HealthBands items={data.items} />

          <HealthMap items={data.items} selectedId={selectedId} onSelect={setSelectedId} />

          <HealthRail items={data.items} selected={selected} onClear={() => setSelectedId(null)} />

          <HealthCountStrip data={data} />
        </div>
      )}
    </div>
  );
}
