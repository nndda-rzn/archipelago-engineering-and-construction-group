import { useState } from 'react';
import { Button, DataGrid } from '@aec/ui';
import { useItps, useInspections, useNcrs, usePunchItems } from '@/features/quality';
import { ItpForm, InspectionForm, NcrForm, PunchForm, itpColumns, insColumns, ncrColumns, punchColumns } from '@/features/quality/ui';
import { PAGE_SIZE } from '@/shared/lib/pagination';
import { useUrlFilter, useUrlPagination } from '@/shared/lib/use-url-state';

type Tab = 'itp' | 'inspections' | 'ncrs' | 'punch';

const TAB_LABELS: Record<Tab, string> = {
  itp: 'ITP',
  inspections: 'Inspeksi',
  ncrs: 'NCR',
  punch: 'Punch',
};

export function QualityPage() {
  const [tab, setTab] = useUrlFilter('tab', 'itp') as [Tab, (v: string) => void];
  const [showForm, setShowForm] = useState(false);
  const { pagination, onPaginationChange } = useUrlPagination(PAGE_SIZE);
  const itps = useItps({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const inspections = useInspections({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const ncrs = useNcrs({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const punch = usePunchItems({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });

  const gridProps = { pagination, onPaginationChange };

  const tabCount: Record<Tab, number> = {
    itp: itps.data?.total ?? 0,
    inspections: inspections.data?.total ?? 0,
    ncrs: ncrs.data?.total ?? 0,
    punch: punch.data?.total ?? 0,
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Quality</h1>
          <p className="mt-1 text-body-sm text-neutral-500">ITP, inspeksi, NCR, punch list (FR-QA-001..004)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Tutup' : '+ Buat Baru'}
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(['itp', 'inspections', 'ncrs', 'punch'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setShowForm(false); }}
            className={`rounded-md px-3 py-1.5 text-body-sm font-medium transition-colors ${
              tab === t ? 'bg-racing-red-600 text-white' : 'border border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
            }`}
          >
            {t === 'itp' ? 'ITP' : `${TAB_LABELS[t]} (${tabCount[t]})`}
          </button>
        ))}
      </div>

      {showForm && tab === 'itp' && <ItpForm onDone={() => setShowForm(false)} />}
      {showForm && tab === 'inspections' && <InspectionForm onDone={() => setShowForm(false)} />}
      {showForm && tab === 'ncrs' && <NcrForm onDone={() => setShowForm(false)} />}
      {showForm && tab === 'punch' && <PunchForm onDone={() => setShowForm(false)} />}

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        {tab === 'itp' && (
          <DataGrid columns={itpColumns} data={itps.data?.items ?? []} rowCount={itps.data?.total ?? 0} isLoading={itps.isLoading} isError={itps.isError} onRetry={() => itps.refetch()} emptyMessage="Belum ada ITP" {...gridProps} />
        )}
        {tab === 'inspections' && (
          <DataGrid columns={insColumns} data={inspections.data?.items ?? []} rowCount={inspections.data?.total ?? 0} isLoading={inspections.isLoading} isError={inspections.isError} onRetry={() => inspections.refetch()} emptyMessage="Belum ada inspeksi" {...gridProps} />
        )}
        {tab === 'ncrs' && (
          <DataGrid columns={ncrColumns} data={ncrs.data?.items ?? []} rowCount={ncrs.data?.total ?? 0} isLoading={ncrs.isLoading} isError={ncrs.isError} onRetry={() => ncrs.refetch()} emptyMessage="Belum ada NCR" {...gridProps} />
        )}
        {tab === 'punch' && (
          <DataGrid columns={punchColumns} data={punch.data?.items ?? []} rowCount={punch.data?.total ?? 0} isLoading={punch.isLoading} isError={punch.isError} onRetry={() => punch.refetch()} emptyMessage="Belum ada punch item" {...gridProps} />
        )}
      </div>
    </div>
  );
}
