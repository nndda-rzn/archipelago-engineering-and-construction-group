import { useState } from 'react';
import { Button, DataGrid, Input, Label } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { ProjectForm, projectColumns } from '@/features/project/ui';
import { PAGE_SIZE } from '@/shared/lib/pagination';

export function ProjectListPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading, isError, refetch } = useProjects({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize, search: search || undefined });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Projects</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Project master (FR-PRJ-001)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>{showForm ? 'Close' : '+ Add Project'}</Button>
      </div>
      {showForm && <ProjectForm onDone={() => setShowForm(false)} />}
      <div className="mb-4 w-64"><Label htmlFor="project-search">Search project</Label><Input id="project-search" type="search" placeholder="Code, name, client…" autoComplete="off" value={search} onChange={(e) => { setSearch(e.target.value); setPagination((p) => ({ ...p, pageIndex: 0 })); }} /></div>
      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        <DataGrid columns={projectColumns} data={data?.items ?? []} rowCount={data?.total ?? 0} pagination={pagination} onPaginationChange={setPagination} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage="No projects yet" exportFilename="projects" />
      </div>
    </div>
  );
}
