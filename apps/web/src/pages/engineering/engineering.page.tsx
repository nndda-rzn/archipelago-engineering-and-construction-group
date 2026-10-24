import { useState } from 'react';
import { Button, DataGrid, SegmentedControl } from '@aec/ui';
import {
  useDeliverables,
  useDrawings,
  useRfis,
  useSubmittals,
  useTransmittals,
} from '@/features/engineering';
import {
  type EngTab,
  EngCreateForm,
  dlvColumns,
  drwColumns,
  rfiColumns,
  subColumns,
  trmColumns,
} from '@/features/engineering/ui';
import { PageHeader } from '@/widgets/page-header';
import { PAGE_SIZE } from '@/shared/lib/pagination';
import { useUrlFilter, useUrlPagination } from '@/shared/lib/use-url-state';

const TABS: Array<{ value: EngTab; label: string }> = [
  { value: 'deliverables', label: 'Deliverables' },
  { value: 'drawings', label: 'Drawings' },
  { value: 'rfis', label: 'RFIs' },
  { value: 'submittals', label: 'Submittals' },
  { value: 'transmittals', label: 'Transmittals' },
];

/**
 * Engineering — dokumen deliverables, drawings, RFI, submittals, transmittals.
 *
 * Komposisi (hierarchy-spatial + proximity):
 * - Header bersama `PageHeader`, memuat aksi "+ Create New".
 * - Form create muncul TEPAT DI BAWAH header, sebelum baris tab: pemicu
 *   (tombol create) dan hasilnya (form) harus satu konteks. Dulu form muncul
 *   SETELAH baris tab, terpisah dari pemicunya oleh lima tab.
 * - Tab memakai `SegmentedControl` bersama — netral dan dapat dinavigasi
 *   keyboard. Dulu tombol kustom dengan latar `racing-red-600` untuk tab aktif:
 *   warna merek menjadi warna navigasi, dan satu-satunya elemen berwarna di
 *   halaman sehingga mata mendarat di tab alih-alih data.
 * - DataGrid dibungkus panel `rounded-md border bg-surface-raised` — dulu
 *   telanjang di atas kanvas, garis baris menggantung tanpa tepi.
 *
 * Fungsional: hanya query tab aktif yang berjalan (`enabled`), pagination di-reset
 * saat berganti tab, dan tab tersimpan di URL.
 */
export function EngineeringPage() {
  const [tab, setTab] = useUrlFilter('tab', 'deliverables') as [EngTab, (v: string) => void];
  const [showForm, setShowForm] = useState(false);
  const { pagination, onPaginationChange, reset } = useUrlPagination(PAGE_SIZE);

  // Hanya query tab aktif yang berjalan. Dulu kelima query dieksekusi serentak
  // saat mount walau satu tab saja yang terlihat.
  const deliverables = useDeliverables({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const drawings = useDrawings({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const rfis = useRfis({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const submittals = useSubmittals({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const transmittals = useTransmittals({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });

  const gridProps = { pagination, onPaginationChange };

  const totals: Record<EngTab, number | undefined> = {
    deliverables: deliverables.data?.total,
    drawings: drawings.data?.total,
    rfis: rfis.data?.total,
    submittals: submittals.data?.total,
    transmittals: transmittals.data?.total,
  };

  const switchTab = (next: string) => {
    if (next === tab) return;
    setTab(next);
    setShowForm(false);
    reset();
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      <PageHeader
        title="Engineering"
        subtitle="Deliverables, drawings, RFIs, submittals and transmittals"
        actions={
          <Button size="sm" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Close' : '+ Create New'}
          </Button>
        }
      />

      {showForm && (
        <EngCreateForm tab={tab} onClose={() => setShowForm(false)} />
      )}

      <SegmentedControl
        aria-label="Engineering document type"
        options={TABS.map((t) => ({ value: t.value, label: `${t.label}${totals[t.value] != null ? ` (${totals[t.value]})` : ''}` }))}
        value={tab}
        onValueChange={switchTab}
      />

      <div className="rounded-md border border-neutral-200 bg-surface-raised shadow-xs">
        {tab === 'deliverables' && (
          <DataGrid
            columns={dlvColumns}
            data={deliverables.data?.items ?? []}
            rowCount={deliverables.data?.total ?? 0}
            isLoading={deliverables.isLoading}
            isError={deliverables.isError}
            onRetry={() => deliverables.refetch()}
            emptyMessage="No deliverables yet"
            {...gridProps}
          />
        )}
        {tab === 'drawings' && (
          <DataGrid
            columns={drwColumns}
            data={drawings.data?.items ?? []}
            rowCount={drawings.data?.total ?? 0}
            isLoading={drawings.isLoading}
            isError={drawings.isError}
            onRetry={() => drawings.refetch()}
            emptyMessage="No drawings yet"
            {...gridProps}
          />
        )}
        {tab === 'rfis' && (
          <DataGrid
            columns={rfiColumns}
            data={rfis.data?.items ?? []}
            rowCount={rfis.data?.total ?? 0}
            isLoading={rfis.isLoading}
            isError={rfis.isError}
            onRetry={() => rfis.refetch()}
            emptyMessage="No RFIs yet"
            {...gridProps}
          />
        )}
        {tab === 'submittals' && (
          <DataGrid
            columns={subColumns}
            data={submittals.data?.items ?? []}
            rowCount={submittals.data?.total ?? 0}
            isLoading={submittals.isLoading}
            isError={submittals.isError}
            onRetry={() => submittals.refetch()}
            emptyMessage="No submittals yet"
            {...gridProps}
          />
        )}
        {tab === 'transmittals' && (
          <DataGrid
            columns={trmColumns}
            data={transmittals.data?.items ?? []}
            rowCount={transmittals.data?.total ?? 0}
            isLoading={transmittals.isLoading}
            isError={transmittals.isError}
            onRetry={() => transmittals.refetch()}
            emptyMessage="No transmittals yet"
            {...gridProps}
          />
        )}
      </div>
    </div>
  );
}
