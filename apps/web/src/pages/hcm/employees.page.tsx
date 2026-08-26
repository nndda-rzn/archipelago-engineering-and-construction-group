import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid, Input, Label } from '@aec/ui';
import { useLegalEntities } from '@/entities/legal-entity';
import { useProjects } from '@/entities/project';
import { useEmployees, useCreateEmployee, useCreateAssignment, useAssignments, useChangeEmployeeStatus, type Employee, type ProjectAssignment } from '@/features/hcm';

const PAGE_SIZE = 20;

const statusVariant: Record<string, 'default' | 'success' | 'warning'> = {
  ACTIVE: 'success',
  INACTIVE: 'warning',
  LEAVER: 'warning',
};

const columnHelper = createColumnHelper<Employee>();
const assignHelper = createColumnHelper<ProjectAssignment>();

const columns = [
  columnHelper.accessor('employeeNumber', {
    header: 'No. Karyawan',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  columnHelper.accessor('name', {
    header: 'Nama',
    cell: (info) => <span className="text-neutral-800 font-medium">{info.getValue()}</span>,
  }),
  columnHelper.accessor('position', {
    header: 'Posisi',
    cell: (info) => <span className="text-neutral-700">{info.getValue()}</span>,
  }),
  columnHelper.accessor('grade', {
    header: 'Grade',
    cell: (info) => <span className="font-mono text-neutral-600">{info.getValue() ?? '—'}</span>,
  }),
  columnHelper.accessor('department', {
    header: 'Departemen',
    cell: (info) => <span className="text-neutral-600">{info.getValue() ?? '—'}</span>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <StatusButtons employee={row.original} />,
  }),
];

function StatusButtons({ employee }: { employee: Employee }) {
  const change = useChangeEmployeeStatus();
  if (employee.status === 'LEAVER') return null;
  return (
    <div className="flex items-center gap-1">
      {employee.status === 'INACTIVE' ? (
        <Button size="sm" variant="ghost" loading={change.isPending} onClick={() => change.mutate({ id: employee.id, status: 'ACTIVE' })}>
          Aktifkan
        </Button>
      ) : (
        <Button size="sm" variant="ghost" loading={change.isPending} onClick={() => change.mutate({ id: employee.id, status: 'INACTIVE' })}>
          Nonaktifkan
        </Button>
      )}
      <Button size="sm" variant="ghost" className="text-destructive-600" loading={change.isPending} onClick={() => change.mutate({ id: employee.id, status: 'LEAVER' })}>
        Leaver
      </Button>
    </div>
  );
}

const assignmentColumns = [
  assignHelper.accessor('project', {
    header: 'Project',
    cell: (info) => <span className="text-neutral-700">{info.getValue()?.code}</span>,
  }),
  assignHelper.accessor('role', {
    header: 'Peran',
    cell: (info) => <span className="text-neutral-600">{info.getValue() ?? '—'}</span>,
  }),
  assignHelper.accessor('allocationPercent', {
    header: 'Alokasi',
    cell: (info) => <span className="font-mono tabular-nums text-neutral-700">{info.getValue()}%</span>,
  }),
  assignHelper.accessor('startDate', {
    header: 'Mulai',
    cell: (info) => <span className="font-mono text-neutral-600">{new Date(info.getValue()).toLocaleDateString('id-ID')}</span>,
  }),
  assignHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={info.getValue() === 'ACTIVE' ? 'success' : 'default'}>{info.getValue()}</Badge>,
  }),
];

function EmployeeForm({ onDone }: { onDone: () => void }) {
  const [legalEntityId, setLegalEntityId] = useState('');
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [grade, setGrade] = useState('');
  const [department, setDepartment] = useState('');
  const entities = useLegalEntities({ page: 1, pageSize: 100 });
  const create = useCreateEmployee();

  const onSubmit = () => {
    if (!legalEntityId || !name || !position) return;
    create.mutate(
      {
        legalEntityId,
        name,
        position,
        grade: grade || undefined,
        department: department || undefined,
      },
      { onSuccess: () => { setName(''); setPosition(''); setGrade(''); setDepartment(''); onDone(); } },
    );
  };

  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="emp-entity">Legal Entity</Label>
          <select
            id="emp-entity"
            value={legalEntityId}
            onChange={(e) => setLegalEntityId(e.target.value)}
            className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="">Pilih entity…</option>
            {(entities.data?.items ?? []).map((e) => <option key={e.id} value={e.id}>{e.code} — {e.legalName}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="emp-name">Nama</Label>
          <Input id="emp-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="emp-pos">Posisi</Label>
          <Input id="emp-pos" placeholder="mis. Site Engineer" value={position} onChange={(e) => setPosition(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="emp-grade">Grade</Label>
          <Input id="emp-grade" placeholder="mis. E3" value={grade} onChange={(e) => setGrade(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="emp-dept">Departemen</Label>
          <Input id="emp-dept" placeholder="mis. Construction" value={department} onChange={(e) => setDepartment(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="button" onClick={onSubmit} loading={create.isPending}>Buat Employee</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal membuat employee.</p>}
    </div>
  );
}

function AssignmentForm({ employee }: { employee: Employee }) {
  const [projectId, setProjectId] = useState('');
  const [role, setRole] = useState('');
  const [allocationPercent, setAllocationPercent] = useState('');
  const [exception, setException] = useState(false);
  const projects = useProjects({ page: 1, pageSize: 100 });
  const create = useCreateAssignment();

  const onSubmit = () => {
    if (!projectId || !allocationPercent) return;
    create.mutate(
      {
        employeeId: employee.id,
        projectId,
        role: role || undefined,
        allocationPercent: Number(allocationPercent),
        exceptionApproved: exception || undefined,
      },
      { onSuccess: () => { setProjectId(''); setRole(''); setAllocationPercent(''); setException(false); } },
    );
  };

  return (
    <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-neutral-100 pt-4">
      <div>
        <Label htmlFor="asg-project">Project</Label>
        <select
          id="asg-project"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
        >
          <option value="">Pilih project…</option>
          {(projects.data?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
        </select>
      </div>
      <div>
        <Label htmlFor="asg-role">Peran</Label>
        <Input id="asg-role" placeholder="mis. Site Engineer" value={role} onChange={(e) => setRole(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="asg-alloc">Alokasi (%)</Label>
        <Input id="asg-alloc" type="number" min={1} max={100} placeholder="mis. 50" value={allocationPercent} onChange={(e) => setAllocationPercent(e.target.value)} />
      </div>
      <label className="flex h-9 items-center gap-2 text-body-sm text-neutral-600">
        <input type="checkbox" checked={exception} onChange={(e) => setException(e.target.checked)} />
        Exception &gt;100%
      </label>
      <Button onClick={onSubmit} loading={create.isPending}>Tambah Assignment</Button>
      {create.isError && <p className="text-caption text-destructive-600">Gagal (mungkin alokasi &gt;100% tanpa exception).</p>}
    </div>
  );
}

export function EmployeesPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading, isError, refetch } = useEmployees({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize, status: statusFilter || undefined });
  const { data: assignData } = useAssignments(selectedId ?? '');

  const selected = data?.items.find((e) => e.id === selectedId) ?? null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Employees</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Master karyawan + project assignment (FR-HCM-001/002/003)</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label="Filter status"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPagination({ pageIndex: 0, pageSize: PAGE_SIZE }); }}
            className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="">Semua status</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
          <Button size="sm" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Tutup' : '+ Buat Employee'}
          </Button>
        </div>
      </div>

      {showForm && <EmployeeForm onDone={() => setShowForm(false)} />}

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
          onRowClick={(row) => setSelectedId(row.original.id)}
          emptyMessage="Belum ada employee"
        />
      </div>

      {selected && (
        <div className="mt-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
          <h2 className="text-h2 text-neutral-950">{selected.employeeNumber} — {selected.name}</h2>
          <p className="text-caption text-neutral-500">{selected.position} · {selected.department ?? '-'} · Klik baris lain untuk ganti</p>
          <AssignmentForm employee={selected} />
          <div className="mt-4">
            <DataGrid columns={assignmentColumns} data={assignData?.items ?? []} emptyMessage="Belum ada assignment" />
          </div>
        </div>
      )}
    </div>
  );
}
