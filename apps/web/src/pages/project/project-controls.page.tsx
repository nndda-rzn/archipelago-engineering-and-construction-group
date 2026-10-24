import { useState } from 'react';
import { EntitySelect, ErrorState } from '@aec/ui';
import { useControlAccounts, useEvm, useForecasts } from '@/features/project';
import { useProjectSchedule, useProjects } from '@/entities/project';
import { ControlsAccounts, ControlsDecisions, ControlsTrajectory, ControlsIndex, ControlsIntegrity } from '@/features/project/ui';
import { PageHeader, ScopeChip } from '@/widgets/page-header';
import { PAGE_SIZE_LARGE as PAGE_SIZE } from '@/shared/lib/pagination';

/**
 * Project Controls — halaman kendali, bukan pelaporan.
 *
 * Tujuan project controls (APM, AACE RP 60R-10, Howell & Ballard) adalah mencegah
 * kejutan dan memicu keputusan, bukan menyajikan riwayat. Karena itu urutannya:
 *
 *   [ INDEKS ]      - posisi proyek sekarang, sebelum bertanya apa yang salah
 *   [ PENYIMPANGAN ]- apa yang menyimpang, terhadap ambang apa, selisihnya berapa
 *   [ TRAJEKTORI ]  - bukti: S-curve + pita variance + garis BAC
 *   [ SUMBER DRIFT ]- control account, unit integrasi menurut AACE
 *   [ INTEGRITAS ]  - apakah angka di atas layak dipercaya
 *
 * Zona dipisah garis penuh selebar kontainer, bukan jarak kosong: halaman ini
 * dibaca seperti lembar instrumen, bukan tumpukan kartu. Header memakai
 * `PageHeader` bersama supaya sederajat dengan halaman lain — sebelumnya halaman
 * ini menulis header sendiri dengan h2 dan bobot ringan, lebih kecil dari h1 di
 * seluruh aplikasi.
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
  const eac = latestForecast ? Number(latestForecast.estimateAtCompletion) : null;

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
  const dataDatePeriod = schedule.data?.actualProgressCurve.at(-1)?.period ?? null;

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      <PageHeader
        // h1 = nama proyek, bukan label generik: halaman ini tentang satu proyek,
        // dan itu informasi pertama yang dicari. Komponen `PageHeader` bersama
        // menjaga ukuran, bobot, dan garisnya tetap sama dengan halaman lain.
        title={selected?.name ?? 'Project controls'}
        subtitle="Project controls — cost and schedule position against the approved baseline"
        scope={
          selected ? (
            <>
              <ScopeChip mono>{selected.code}</ScopeChip>
              {dataDatePeriod && <ScopeChip mono>DATA DATE {dataDatePeriod}</ScopeChip>}
            </>
          ) : undefined
        }
        actions={
          <>
            <EntitySelect
              value={projectId}
              onValueChange={setProjectId}
              options={(projects.data?.items ?? []).map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` }))}
              placeholder="Select a project…"
              searchPlaceholder="Search project…"
              className="h-8 w-[24rem] text-body-sm"
            />
            <span className="text-caption uppercase tracking-wide text-neutral-500">{today}</span>
          </>
        }
      />

      {!projectId && (
        <p className="py-12 text-body-sm text-neutral-500">Select a project to see its control position.</p>
      )}

      {isLoading && projectId && (
        <div aria-busy="true" className="space-y-6">
          <div className="h-[120px] animate-pulse bg-neutral-100" />
          <div className="h-[304px] animate-pulse bg-neutral-100" />
        </div>
      )}

      {isError && projectId && (
        <ErrorState message="Could not load project controls." onRetry={() => { void evm.refetch(); void schedule.refetch(); }} />
      )}

      {evm.data && schedule.data && projectId && (
        <>
          <ControlsIndex evm={evm.data} eac={eac} />

          <ControlsDecisions
            evm={evm.data}
            eac={eac}
            caIssueCount={caIssues}
            caTotal={caItems.length}
          />

          <ControlsTrajectory
            schedule={schedule.data}
            bac={evm.data.metrics.bac}
            eac={eac}
            dataDateIndex={dataDateIndex}
          />

          <ControlsAccounts accounts={caItems} />

          <ControlsIntegrity issueCount={caIssues} total={caItems.length} />
        </>
      )}
    </div>
  );
}
