import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid, Input, Label } from '@aec/ui';
import { useProjects } from '@/entities/project';
import {
  useEquipment, useCreateEquipment, useEquipmentAssignments, useCreateEquipmentAssignment, useEndEquipmentAssignment,
  useCreateEquipmentUtilization, useEquipmentPms, useCreateEquipmentPm, useCompleteEquipmentPm,
  useEquipmentBreakdowns, useCreateEquipmentBreakdown, useResolveEquipmentBreakdown, useCreateEquipmentUsage,
  type Equipment, type EquipmentAssignment, type EquipmentPm, type EquipmentBreakdown,
} from '@/features/hcm';
import { formatIdr as fmt } from '@/shared/lib/format';

const PAGE_SIZE = 20;

const statusVariant: Record<string, 'default' | 'success' | 'warning'> = {
  AVAILABLE: 'success',
  ASSIGNED: 'default',
  MAINTENANCE: 'warning',
  BREAKDOWN: 'warning',
  RETIRED: 'warning',
};

const columnHelper = createColumnHelper<Equipment>();
const assignHelper = createColumnHelper<EquipmentAssignment>();
const pmHelper = createColumnHelper<EquipmentPm>();
const bdHelper = createColumnHelper<EquipmentBreakdown>();

const columns = [
  columnHelper.accessor('equipmentNumber', {
    header: 'No. Alat',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  columnHelper.accessor('name', {
    header: 'Nama',
    cell: (info) => <span className="text-neutral-800 font-medium">{info.getValue()}</span>,
  }),
  columnHelper.accessor('category', {
    header: 'Kategori',
    cell: (info) => <Badge variant="default">{info.getValue()}</Badge>,
  }),
  columnHelper.accessor('serialNumber', {
    header: 'Serial',
    cell: (info) => <span className="font-mono text-neutral-600">{info.getValue() ?? '—'}</span>,
  }),
  columnHelper.accessor('currentMeter', {
    header: 'Meter',
    cell: (info) => <span className="font-mono tabular-nums text-neutral-700">{Number(info.getValue()).toLocaleString('id-ID')} jam</span>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
];

const assignmentColumns = [
  assignHelper.accessor('project', {
    header: 'Project',
    cell: (info) => <span className="text-neutral-700">{info.getValue()?.code}</span>,
  }),
  assignHelper.accessor('startDate', {
    header: 'Mulai',
    cell: (info) => <span className="font-mono text-neutral-600">{new Date(info.getValue()).toLocaleDateString('id-ID')}</span>,
  }),
  assignHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={info.getValue() === 'ACTIVE' ? 'success' : 'default'}>{info.getValue()}</Badge>,
  }),
  assignHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const end = useEndEquipmentAssignment();
      if (row.original.status !== 'ACTIVE') return null;
      return (
        <Button size="sm" variant="ghost" loading={end.isPending} onClick={() => end.mutate({ equipmentId: row.original.equipmentId, assignmentId: row.original.id })}>
          Akhiri
        </Button>
      );
    },
  }),
];

const pmColumns = [
  pmHelper.accessor('triggerType', {
    header: 'Trigger',
    cell: (info) => <Badge variant="default">{info.getValue()}</Badge>,
  }),
  pmHelper.accessor('dueDate', {
    header: 'Jatuh Tempo',
    cell: (info) => {
      const due = info.getValue();
      return <span className="font-mono text-neutral-600">{due ? new Date(due).toLocaleDateString('id-ID') : '—'}</span>;
    },
  }),
  pmHelper.accessor('dueMeter', {
    header: 'Due Meter',
    cell: (info) => (info.getValue() != null ? <span className="font-mono tabular-nums text-neutral-700">{info.getValue()} jam</span> : '—'),
  }),
  pmHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={info.getValue() === 'DONE' ? 'success' : info.getValue() === 'OVERDUE' ? 'warning' : 'default'}>{info.getValue()}</Badge>,
  }),
  pmHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const complete = useCompleteEquipmentPm();
      if (row.original.status !== 'SCHEDULED') return null;
      return (
        <Button size="sm" variant="secondary" loading={complete.isPending} onClick={() => complete.mutate({ equipmentId: row.original.equipmentId, pmId: row.original.id })}>
          Selesai
        </Button>
      );
    },
  }),
];

const breakdownColumns = [
  bdHelper.accessor('breakdownDate', {
    header: 'Tanggal',
    cell: (info) => <span className="font-mono text-neutral-600">{new Date(info.getValue()).toLocaleDateString('id-ID')}</span>,
  }),
  bdHelper.accessor('downtimeHours', {
    header: 'Downtime (jam)',
    cell: (info) => <span className="font-mono tabular-nums text-neutral-700">{info.getValue()}</span>,
  }),
  bdHelper.accessor('costImpact', {
    header: 'Dampak Biaya',
    cell: (info) => <span className="font-mono tabular-nums text-destructive-600">{fmt(info.getValue())}</span>,
  }),
  bdHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={info.getValue() === 'OPEN' ? 'warning' : 'success'}>{info.getValue()}</Badge>,
  }),
  bdHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const resolve = useResolveEquipmentBreakdown();
      if (row.original.status !== 'OPEN') return null;
      return (
        <Button size="sm" variant="secondary" loading={resolve.isPending} onClick={() => resolve.mutate({ equipmentId: row.original.equipmentId, breakdownId: row.original.id })}>
          Resolve
        </Button>
      );
    },
  }),
];

function EquipmentForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('HEAVY');
  const [serialNumber, setSerialNumber] = useState('');
  const create = useCreateEquipment();

  const onSubmit = () => {
    if (!name) return;
    create.mutate(
      { name, category, serialNumber: serialNumber || undefined },
      { onSuccess: () => { setName(''); setSerialNumber(''); onDone(); } },
    );
  };

  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="eq-name">Nama Alat</Label>
          <Input id="eq-name" placeholder="mis. Excavator PC200" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="eq-cat">Kategori</Label>
          <select
            id="eq-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="HEAVY">HEAVY</option>
            <option value="LIGHT">LIGHT</option>
            <option value="VEHICLE">VEHICLE</option>
            <option value="TOOL">TOOL</option>
            <option value="OTHER">OTHER</option>
          </select>
        </div>
        <div>
          <Label htmlFor="eq-serial">Serial</Label>
          <Input id="eq-serial" placeholder="Opsional" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="button" onClick={onSubmit} loading={create.isPending}>Buat Equipment</Button>
      </div>
    </div>
  );
}

function EquipmentDetail({ equipment }: { equipment: Equipment }) {
  const [projectId, setProjectId] = useState('');
  const [utilization, setUtilization] = useState('');
  const [breakdownHours, setBreakdownHours] = useState('');
  const [breakdownCost, setBreakdownCost] = useState('');
  const [usageProject, setUsageProject] = useState('');
  const [usageHours, setUsageHours] = useState('');
  const [usageCost, setUsageCost] = useState('');
  const projects = useProjects({ page: 1, pageSize: 100 });
  const assign = useCreateEquipmentAssignment();
  const util = useCreateEquipmentUtilization();
  const pm = useCreateEquipmentPm();
  const bd = useCreateEquipmentBreakdown();
  const usage = useCreateEquipmentUsage();
  const { data: assignments } = useEquipmentAssignments(equipment.id);
  const { data: pms } = useEquipmentPms(equipment.id);
  const { data: breakdowns } = useEquipmentBreakdowns(equipment.id);

  return (
    <div className="mt-6 space-y-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <h2 className="text-h2 text-neutral-950">{equipment.equipmentNumber} — {equipment.name}</h2>
      <p className="text-caption text-neutral-500">Meter {Number(equipment.currentMeter).toLocaleString('id-ID')} jam · Status {equipment.status} · Klik baris lain untuk ganti</p>

      <div className="flex flex-wrap items-end gap-2 border-t border-neutral-100 pt-4">
        <div>
          <Label htmlFor="eqasg-project">Assign ke Project</Label>
          <select
            id="eqasg-project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="">Pilih project…</option>
            {(projects.data?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
          </select>
        </div>
        <Button size="sm" variant="secondary" loading={assign.isPending} onClick={() => projectId && assign.mutate({ equipmentId: equipment.id, projectId })}>
          Assign
        </Button>
        <div>
          <Label htmlFor="equtil-ops">Operasi (jam)</Label>
          <Input id="equtil-ops" type="number" min={0} max={24} placeholder="mis. 8" value={utilization} onChange={(e) => setUtilization(e.target.value)} />
        </div>
        <Button size="sm" variant="secondary" loading={util.isPending} onClick={() => utilization && util.mutate({ equipmentId: equipment.id, availableHours: 10, operatingHours: Number(utilization) })}>
          Catat Utilisasi
        </Button>
        <div>
          <Label htmlFor="eqpm-date">Jadwal PM (tanggal)</Label>
          <Input id="eqpm-date" type="date" onChange={(e) => pm.mutate({ equipmentId: equipment.id, triggerType: 'DATE', dueDate: e.target.value || undefined })} />
        </div>
        <div>
          <Label htmlFor="eqbd-hours">Downtime (jam)</Label>
          <Input id="eqbd-hours" type="number" min={0.1} placeholder="mis. 12" value={breakdownHours} onChange={(e) => setBreakdownHours(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="eqbd-cost">Dampak Biaya</Label>
          <Input id="eqbd-cost" type="number" min={0} placeholder="mis. 5000000" value={breakdownCost} onChange={(e) => setBreakdownCost(e.target.value)} />
        </div>
        <Button size="sm" variant="secondary" loading={bd.isPending} onClick={() => breakdownHours && bd.mutate({ equipmentId: equipment.id, downtimeHours: Number(breakdownHours), costImpact: breakdownCost ? Number(breakdownCost) : undefined })}>
          Catat Breakdown
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-2 border-t border-neutral-100 pt-4">
        <div>
          <Label htmlFor="equsage-project">Usage ke Project</Label>
          <select
            id="equsage-project"
            value={usageProject}
            onChange={(e) => setUsageProject(e.target.value)}
            className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="">Pilih project…</option>
            {(projects.data?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="equsage-hours">Jam</Label>
          <Input id="equsage-hours" type="number" min={0.1} placeholder="mis. 40" value={usageHours} onChange={(e) => setUsageHours(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="equsage-cost">Biaya</Label>
          <Input id="equsage-cost" type="number" min={0} placeholder="mis. 20000000" value={usageCost} onChange={(e) => setUsageCost(e.target.value)} />
        </div>
        <Button size="sm" variant="secondary" loading={usage.isPending} onClick={() => usageProject && usageHours && usage.mutate({ equipmentId: equipment.id, projectId: usageProject, hours: Number(usageHours), costAmount: Number(usageCost || 0) })}>
          Catat Usage
        </Button>
        <p className="text-caption text-neutral-500">FR-EQP-006: usage → project cost</p>
      </div>

      <div className="grid grid-cols-1 gap-4 border-t border-neutral-100 pt-4 xl:grid-cols-3">
        <div>
          <h3 className="mb-2 text-body font-semibold text-neutral-800">Assignments</h3>
          <DataGrid columns={assignmentColumns} data={assignments?.items ?? []} emptyMessage="Belum ada" />
        </div>
        <div>
          <h3 className="mb-2 text-body font-semibold text-neutral-800">PM Schedule</h3>
          <DataGrid columns={pmColumns} data={pms?.items ?? []} emptyMessage="Belum ada" />
        </div>
        <div>
          <h3 className="mb-2 text-body font-semibold text-neutral-800">Breakdown</h3>
          <DataGrid columns={breakdownColumns} data={breakdowns?.items ?? []} emptyMessage="Belum ada" />
        </div>
      </div>
    </div>
  );
}

export function EquipmentPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading, isError, refetch } = useEquipment({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize, status: statusFilter || undefined });

  const selected = data?.items.find((e) => e.id === selectedId) ?? null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Equipment</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Master alat, assignment, utiliasi, PM, breakdown, usage cost (FR-EQP-001..006)</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label="Filter status"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPagination({ pageIndex: 0, pageSize: PAGE_SIZE }); }}
            className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="">Semua status</option>
            <option value="AVAILABLE">AVAILABLE</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="BREAKDOWN">BREAKDOWN</option>
          </select>
          <Button size="sm" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Tutup' : '+ Buat Equipment'}
          </Button>
        </div>
      </div>

      {showForm && <EquipmentForm onDone={() => setShowForm(false)} />}

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
          emptyMessage="Belum ada equipment"
        />
      </div>

      {selected && <EquipmentDetail equipment={selected} />}
    </div>
  );
}
