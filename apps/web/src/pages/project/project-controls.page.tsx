import { useState } from 'react';
import { EntitySelect, ErrorState } from '@aec/ui';
import { useControlAccounts, useEvm, useForecasts } from '@/features/project';
import { useProjectSchedule, useProjects } from '@/entities/project';
import { ControlsAccounts, ControlsDecisions, ControlsTrajectory } from '@/features/project/ui';
import { PAGE_SIZE_LARGE as PAGE_SIZE } from '@/shared/lib/pagination';

/**
 * Project Controls — halaman kendali, bukan pelaporan.
 *
 * Tujuan project controls (APM, AACE RP 60R-10, Howell & Ballard) adalah
 * mencegah kejutan dan memicu keputusan, bukan menyajikan riwayat. Karena itu
 * urutannya:
 *
 *   A. identitas            — dokumen apa ini
 *   B. KEPUTUSAN            — apa yang menyimpang dan mengapa (bukan grafik dulu)
 *   C. TRAJEKTORI           — bukti: S-curve + pita variance + garis BAC
 *   D. SUMBER DRIFT         — control account, unit integrasi menurut AACE
 *
 * Tab dihapus: lima tab menyembunyikan cerita dan membuat Cost Code — yang
 * kosong di seluruh sistem — menjadi halaman pertama yang dilihat pengguna.
 */
export function ProjectControlsPage() {
  const [projectId, setProjectId] = useState('');
  const projects = useProjects({ page: 1, pageSize: PAGE_SIZE });

  const evm = useEvm(projectId);
  const schedule = useProjectSchedule(projectId);
  const accounts = useControlAccounts(projectId, { page: 1, pageSize: 100 });
  const forecasts = useForecasts(projectId);

  const selected = (projects.data?.items ?? []).find((p) => p.id === projectId);
  const latestForecast = forecasts.data?.items?.[0] ?? null;

  const today = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date());
  const isLoading = evm.isLoading || schedule.isLoading;
  const isError = evm.isError || schedule.isError;

  const caItems = accounts.data?.items ?? [];
  const caIssues = caItems.filter((a) => a.dataIssue).length;

  // Indeks data date: jumlah periode rencana yang sudah lewat.
  const dataDateIndex = schedule.data
    ? Math.max(0, (schedule.data.actualProgressCurve.at(-1)?.period
        ? schedule.data.plannedCurve.findIndex((p) => p.period === schedule.data!.actualProgressCurve.at(-1)!.period)
        : schedule.data.plannedCurve.length - 1))
    : 0;

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-neutral-300 pb-3">
        <div className="min-w-0">
          <p className="font-mono text-caption text-neutral-900/40">{selected?.code ?? '—'}</p>
          <h1 className="mt-0.5 truncate text-h2 font-light tracking-tight text-neutral-950">
            {selected?.name ?? 'Project controls'}
          </h1>
        </div>
        <div className="flex items-end gap-3">
          <EntitySelect
            value={projectId}
            onValueChange={setProjectId}
            options={(projects.data?.items ?? []).map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` }))}
            placeholder="Select a project…"
            searchPlaceholder="Search project…"
            className="h-9 w-64 text-body-sm"
          />
          <p className="text-caption uppercase tracking-wide text-neutral-900/40">{today}</p>
        </div>
      </header>

      {!projectId && (
        <p className="py-12 text-body-sm text-neutral-900/70">Pilih proyek untuk melihat posisi kendalinya.</p>
      )}

      {isLoading && projectId && (
        <div aria-busy="true" className="mt-6 space-y-6">
          <div className="h-[120px] animate-pulse bg-neutral-100" />
          <div className="h-[304px] animate-pulse bg-neutral-100" />
        </div>
      )}

      {isError && projectId && (
        <div className="mt-6">
          <ErrorState message="Gagal memuat data project controls." onRetry={() => { void evm.refetch(); void schedule.refetch(); }} />
        </div>
      )}

      {evm.data && schedule.data && projectId && (
        <div className="mt-6 space-y-8">
          <ControlsDecisions
            evm={evm.data}
            eac={latestForecast ? Number(latestForecast.estimateAtCompletion) : null}
            caIssueCount={caIssues}
            caTotal={caItems.length}
          />

          <ControlsTrajectory
            schedule={schedule.data}
            bac={evm.data.metrics.bac}
            eac={latestForecast ? Number(latestForecast.estimateAtCompletion) : null}
            dataDateIndex={dataDateIndex}
          />

          <ControlsAccounts accounts={caItems} />
        </div>
      )}
    </div>
  );
}
