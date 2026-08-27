import { useState } from 'react';
import { Button, EntitySelect } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useProjectHealth } from '@/features/project';
import { HealthSummary, HealthTable } from '@/features/project/ui';

export function ProjectHealthPage() {
  const [projectId, setProjectId] = useState('');
  const projects = useProjects({ page: 1, pageSize: 100 });
  const defaultProjectId = projectId || projects.data?.items[0]?.id || '';
  const { data, isLoading, isError, refetch } = useProjectHealth(defaultProjectId);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Project Health</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Actual cost vs budget per WBS (FR-PRJ-004)</p>
        </div>
        <div className="flex items-center gap-3">
          <EntitySelect
            value={defaultProjectId}
            onValueChange={setProjectId}
            options={(projects.data?.items ?? []).map((p) => ({ value: p.id, label: p.code }))}
            placeholder="Pilih project…"
            searchPlaceholder="Cari project…"
            className="w-56"
          />
          <Button size="sm" variant="secondary" onClick={() => refetch()} disabled={isLoading}>Muat Ulang</Button>
        </div>
      </div>

      {!defaultProjectId && <p className="text-body-sm text-neutral-500">Pilih project untuk melihat health.</p>}

      {defaultProjectId && (
        <div className="space-y-6">
          {isLoading && <p className="text-body-sm text-neutral-500">Menghitung…</p>}
          {isError && <p className="text-body-sm text-destructive-600">Gagal memuat health project.</p>}
          {!isLoading && !isError && data && (
            <>
              <HealthSummary data={data} />
              <HealthTable data={data} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
