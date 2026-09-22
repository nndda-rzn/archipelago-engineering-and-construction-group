import { useState } from 'react';
import { Button, DataGrid } from '@aec/ui';
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
import { PAGE_SIZE } from '@/shared/lib/pagination';
import { useUrlFilter, useUrlPagination } from '@/shared/lib/use-url-state';

export function EngineeringPage() {
  const [tab, setTab] = useUrlFilter('tab', 'deliverables') as [EngTab, (v: string) => void];
  const [showForm, setShowForm] = useState(false);
  const { pagination, onPaginationChange } = useUrlPagination(PAGE_SIZE);

  const deliverables = useDeliverables({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const drawings = useDrawings({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const rfis = useRfis({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const submittals = useSubmittals({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const transmittals = useTransmittals({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });

  const gridProps = { pagination, onPaginationChange };

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Engineering</h1>
          <p className="text-body text-neutral-500">
            Kelola deliverable, drawing, RFI, submittal, transmittal (FR-ENG-001..005)
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Tutup' : '+ Buat Baru'}
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(['deliverables', 'drawings', 'rfis', 'submittals', 'transmittals'] as EngTab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setShowForm(false); }}
            className={
              tab === t
                ? 'rounded-md px-3 py-1.5 text-body-sm font-medium transition-colors bg-racing-red-600 text-white'
                : 'rounded-md px-3 py-1.5 text-body-sm font-medium transition-colors bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300'
            }
          >
            {t === 'deliverables' && ('Deliverable (' + (deliverables.data?.total ?? 0) + ')')}
            {t === 'drawings' && ('Drawing (' + (drawings.data?.total ?? 0) + ')')}
            {t === 'rfis' && ('RFI (' + (rfis.data?.total ?? 0) + ')')}
            {t === 'submittals' && ('Submittal (' + (submittals.data?.total ?? 0) + ')')}
            {t === 'transmittals' && ('Transmittal (' + (transmittals.data?.total ?? 0) + ')')}
          </button>
        ))}
      </div>

      {showForm && <EngCreateForm tab={tab} onClose={() => setShowForm(false)} />}

      <div>
        {tab === 'deliverables' && (
          <DataGrid
            columns={dlvColumns}
            data={deliverables.data?.items ?? []}
            rowCount={deliverables.data?.total ?? 0}
            isLoading={deliverables.isLoading}
            isError={deliverables.isError}
            onRetry={() => deliverables.refetch()}
            emptyMessage="Belum ada deliverable"
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
            emptyMessage="Belum ada drawing"
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
            emptyMessage="Belum ada RFI"
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
            emptyMessage="Belum ada submittal"
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
            emptyMessage="Belum ada transmittal"
            {...gridProps}
          />
        )}
      </div>
    </div>
  );
}
