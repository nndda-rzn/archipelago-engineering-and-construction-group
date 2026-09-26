import { useState } from 'react';
import { Button, DataGrid, EntitySelect } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useHandovers } from '@/features/construction';
import { HandoverForm, HandoverDetail, handoverColumns } from '@/features/construction/ui';
import { PAGE_SIZE } from '@/shared/lib/pagination';

export function HandoverPage() {
  const [projectId, setProjectId] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<import('@aec/api-contracts').HandoverPackage | null>(null);
  const { data: projects } = useProjects({ page: 1, pageSize: 100 });
  const { data, isLoading, isError, refetch } = useHandovers(projectId, { page: pagination.pageIndex + 1, pageSize: pagination.pageSize });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Handover</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Serah terima & closeout · cek dokumen mandatory (FR-CON-006)</p>
        </div>
        <div className="flex items-center gap-2">
          <EntitySelect
            value={projectId}
            onValueChange={(v) => { setProjectId(v); setPagination({ pageIndex: 0, pageSize: PAGE_SIZE }); setSelected(null); }}
            options={(projects?.items ?? []).map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` }))}
            placeholder="Pilih Project…"
            searchPlaceholder="Cari project…"
            className="w-64"
          />
          {projectId && <Button size="sm" onClick={() => setShowForm(true)} disabled={showForm}>+ Handover</Button>}
        </div>
      </div>

      {showForm && projectId && <HandoverForm projectId={projectId} onDone={() => setShowForm(false)} />}
      {!projectId && <p className="text-body-sm text-neutral-500">Pilih project untuk melihat handover.</p>}
      {projectId && (
        <>
          <DataGrid columns={handoverColumns} data={data?.items ?? []} rowCount={data?.total ?? 0} pagination={pagination} onPaginationChange={setPagination} isLoading={isLoading} isError={isError} onRetry={refetch} onRowClick={(row) => setSelected(row.original)} selectedRowId={selected?.id} getRowId={(row) => row.id} emptyMessage="Belum ada handover" />
          <p className="mt-2 text-caption text-neutral-500">Klik baris untuk detail & verifikasi dokumen.</p>
        </>
      )}
      {selected && <HandoverDetail selected={selected} projectId={projectId} />}
    </div>
  );
}
