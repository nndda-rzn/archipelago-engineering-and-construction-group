import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid, Input, Label } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useEmployees, useTimesheets, useCreateTimesheet, useApproveTimesheet, type Timesheet } from '@/features/hcm';

const PAGE_SIZE = 20;

const statusVariant: Record<string, 'default' | 'success' | 'warning'> = {
  SUBMITTED: 'default',
  APPROVED: 'success',
  REJECTED: 'warning',
};

const columnHelper = createColumnHelper<Timesheet>();

const columns = [
  columnHelper.accessor('workDate', {
    header: 'Tanggal',
    cell: (info) => <span className="font-mono text-neutral-600">{new Date(info.getValue()).toLocaleDateString('id-ID')}</span>,
  }),
  columnHelper.accessor('employee', {
    header: 'Karyawan',
    cell: (info) => <span className="text-neutral-800 font-medium">{info.getValue()?.name}</span>,
  }),
  columnHelper.accessor('project', {
    header: 'Project',
    cell: (info) => <span className="text-neutral-700">{info.getValue()?.code}</span>,
  }),
  columnHelper.accessor('activity', {
    header: 'Aktivitas',
    cell: (info) => <span className="text-neutral-600">{info.getValue() ?? '—'}</span>,
  }),
  columnHelper.accessor('hours', {
    header: 'Jam',
    cell: (info) => <span className="font-mono tabular-nums text-neutral-800 font-medium">{info.getValue()}</span>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <ApproveButtons entry={row.original} />,
  }),
];

function ApproveButtons({ entry }: { entry: Timesheet }) {
  const approve = useApproveTimesheet();
  if (entry.status !== 'SUBMITTED') return null;
  return (
    <div className="flex items-center gap-1">
      <Button size="sm" variant="secondary" loading={approve.isPending} onClick={() => approve.mutate({ id: entry.id })}>
        Setujui
      </Button>
      <Button size="sm" variant="ghost" onClick={() => approve.mutate({ id: entry.id, status: 'REJECTED' })}>
        Tolak
      </Button>
    </div>
  );
}

function TimesheetForm({ onDone }: { onDone: () => void }) {
  const [employeeId, setEmployeeId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [hours, setHours] = useState('');
  const [activity, setActivity] = useState('');
  const projects = useProjects({ page: 1, pageSize: 100 });
  const employees = useEmployees({ page: 1, pageSize: 100 });
  const create = useCreateTimesheet();

  const onSubmit = () => {
    if (!employeeId || !projectId || !hours) return;
    create.mutate(
      { employeeId, projectId, hours: Number(hours), activity: activity || undefined },
      { onSuccess: () => { setEmployeeId(''); setProjectId(''); setHours(''); setActivity(''); onDone(); } },
    );
  };

  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="ts-emp">Karyawan</Label>
          <select
            id="ts-emp"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="">Pilih karyawan…</option>
            {(employees.data?.items ?? []).map((e) => <option key={e.id} value={e.id}>{e.employeeNumber} — {e.name}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="ts-project">Project</Label>
          <select
            id="ts-project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="">Pilih project…</option>
            {(projects.data?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="ts-hours">Jam Kerja</Label>
          <Input id="ts-hours" type="number" min={0.5} max={24} step={0.5} placeholder="mis. 8" value={hours} onChange={(e) => setHours(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ts-activity">Aktivitas</Label>
          <Input id="ts-activity" placeholder="mis. Ereksi baja" value={activity} onChange={(e) => setActivity(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="button" onClick={onSubmit} loading={create.isPending}>Kirim Timesheet</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal mengirim timesheet.</p>}
    </div>
  );
}

export function TimesheetsPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading, isError, refetch } = useTimesheets({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize, status: statusFilter || undefined });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Timesheet</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Jam kerja karyawan ke project/WBS (FR-HCM-004)</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label="Filter status"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPagination({ pageIndex: 0, pageSize: PAGE_SIZE }); }}
            className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="">Semua status</option>
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="APPROVED">APPROVED</option>
          </select>
          <Button size="sm" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Tutup' : '+ Kirim Timesheet'}
          </Button>
        </div>
      </div>

      {showForm && <TimesheetForm onDone={() => setShowForm(false)} />}

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        <DataGrid
          columns={columns}
          data={data?.items ?? []}
          rowCount={data?.total ?? 0}
          pagination={pagination}
          onPaginationChange={setPagination}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          emptyMessage="Belum ada timesheet"
        />
      </div>
    </div>
  );
}
