import { Button, EntitySelect } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useProjectHealth } from '@/features/project';
import { HealthSummary, HealthTable } from '@/features/project/ui';
import { useUrlFilter } from '@/shared/lib/use-url-state';

export function ProjectHealthPage() {
  const [projectId, setProjectId] = useUrlFilter('project');
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
            options={(projects.data?.items ?? []).map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` }))}
            placeholder="Select project…"
            searchPlaceholder="Search project…"
            className="w-56"
          />
          <Button size="sm" variant="secondary" onClick={() => refetch()} disabled={isLoading}>Reload</Button>
        </div>
      </div>

      {!defaultProjectId && <p className="text-body-sm text-neutral-500">Select a project to view health.</p>}

      {defaultProjectId && (
        <div className="space-y-6">
          {isLoading && <p className="text-body-sm text-neutral-500">Computing…</p>}
          {isError && <p className="text-body-sm text-destructive-600">Failed to load project health.</p>}
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
