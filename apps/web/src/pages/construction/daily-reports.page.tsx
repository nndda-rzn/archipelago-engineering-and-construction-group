import { useState } from 'react';
import { Button, DataGrid } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useDailyReports } from '@/features/construction';
import { CreateDailyReportForm, dailyReportColumns } from '@/features/construction/ui';

const PAGE_SIZE = 20;

export function DailyReportsPage() {
  const [projectId, setProjectId] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);
  const { data: projects } = useProjects({ page: 1, pageSize: 100 });
  const { data, isLoading, isError, refetch } = useDailyReports(projectId, { page: pagination.pageIndex + 1, pageSize: pagination.pageSize });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Daily Report</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Laporan harian lapangan konstruksi (FR-CON-003)</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={projectId} onChange={(e) => { setProjectId(e.target.value); setPagination({ pageIndex: 0, pageSize: PAGE_SIZE }); }} className="rounded-md border border-neutral-300 px-3 py-2 text-body-sm">
            <option value="">Pilih Project...</option>
            {projects?.items.map((p) => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
          </select>
          {projectId && <Button size="sm" onClick={() => setShowForm(true)} disabled={showForm}>+ Daily Report</Button>}
        </div>
      </div>

      {showForm && projectId && <div className="mb-6"><CreateDailyReportForm projectId={projectId} onDone={() => setShowForm(false)} /></div>}
      {!projectId && <p className="text-body-sm text-neutral-500">Pilih project untuk melihat daily reports.</p>}
      {projectId && (
        <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
          <DataGrid columns={dailyReportColumns} data={data?.items ?? []} rowCount={data?.total ?? 0} pagination={pagination} onPaginationChange={setPagination} isLoading={isLoading} isError={isError} onRetry={refetch} emptyMessage="Belum ada daily report" exportFilename="daily-reports" />
        </div>
      )}
    </div>
  );
}
