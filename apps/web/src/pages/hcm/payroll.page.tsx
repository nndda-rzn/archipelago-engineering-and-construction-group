import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid, Input, Label } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useEmployees, usePayrollAllocations, useCreatePayrollAllocation, type PayrollAllocation } from '@/features/hcm';
import { formatIdr as fmt } from '@/shared/lib/format';

const PAGE_SIZE = 20;

const columnHelper = createColumnHelper<PayrollAllocation>();

const columns = [
  columnHelper.accessor('period', {
    header: 'Periode',
    cell: (info) => <span className="font-mono text-neutral-600">{info.getValue()}</span>,
  }),
  columnHelper.accessor('employee', {
    header: 'Karyawan',
    cell: (info) => <span className="text-neutral-800 font-medium">{info.getValue()?.name}</span>,
  }),
  columnHelper.accessor('project', {
    header: 'Project',
    cell: (info) => {
      const p = info.getValue();
      return p ? <span className="text-neutral-700">{p.code}</span> : <span className="text-neutral-400">— (overhead)</span>;
    },
  }),
  columnHelper.accessor('grossAmount', {
    header: 'Gross',
    cell: (info) => <span className="font-mono tabular-nums text-neutral-800 font-medium">{fmt(info.getValue())}</span>,
  }),
  columnHelper.accessor('projectAmount', {
    header: 'ke Project',
    cell: (info) => <span className="font-mono tabular-nums text-emerald-700">{fmt(info.getValue())}</span>,
  }),
  columnHelper.accessor('overheadAmount', {
    header: 'Overhead',
    cell: (info) => <span className="font-mono tabular-nums text-amber-700">{fmt(info.getValue())}</span>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={info.getValue() === 'POSTED' ? 'success' : 'default'}>{info.getValue()}</Badge>,
  }),
];

function PayrollForm({ onDone }: { onDone: () => void }) {
  const [employeeId, setEmployeeId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [period, setPeriod] = useState('');
  const [gross, setGross] = useState('');
  const [projectAmount, setProjectAmount] = useState('');
  const employees = useEmployees({ page: 1, pageSize: 100 });
  const projects = useProjects({ page: 1, pageSize: 100 });
  const create = useCreatePayrollAllocation();

  const overhead = gross && projectAmount ? Math.max(Number(gross) - Number(projectAmount), 0) : 0;
  const balanced = gross && projectAmount ? Number(gross) - Number(projectAmount) >= 0 : false;

  const onSubmit = () => {
    if (!employeeId || !period || !gross) return;
    create.mutate(
      {
        employeeId,
        projectId: projectId || undefined,
        period,
        grossAmount: Number(gross),
        projectAmount: Number(projectAmount || 0),
        overheadAmount: overhead,
      },
      { onSuccess: () => { setEmployeeId(''); setProjectId(''); setPeriod(''); setGross(''); setProjectAmount(''); onDone(); } },
    );
  };

  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="pa-emp">Karyawan</Label>
          <select
            id="pa-emp"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="">Pilih karyawan…</option>
            {(employees.data?.items ?? []).map((e) => <option key={e.id} value={e.id}>{e.employeeNumber} — {e.name}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="pa-period">Periode</Label>
          <Input id="pa-period" placeholder="mis. 2026-08" value={period} onChange={(e) => setPeriod(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="pa-project">Project (opsional)</Label>
          <select
            id="pa-project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="">Corporate overhead</option>
            {(projects.data?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
          </select>
        </div>
        <div />
        <div>
          <Label htmlFor="pa-gross">Gross Payroll</Label>
          <Input id="pa-gross" type="number" min={0} step={100000} value={gross} onChange={(e) => setGross(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="pa-project-amt">Alokasi ke Project</Label>
          <Input id="pa-project-amt" type="number" min={0} step={100000} value={projectAmount} onChange={(e) => setProjectAmount(e.target.value)} />
        </div>
      </div>
      <p className={`mt-2 text-caption ${balanced ? 'text-emerald-700' : 'text-destructive-600'}`}>
        Overhead otomatis: {fmt(overhead)} — {balanced ? 'balance OK (gross = project + overhead)' : 'alokasi melebihi gross'}
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="button" onClick={onSubmit} loading={create.isPending} disabled={!balanced}>
          Buat Alokasi
        </Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal membuat alokasi payroll.</p>}
    </div>
  );
}

export function PayrollPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);
  const [periodFilter, setPeriodFilter] = useState('');
  const { data, isLoading, isError, refetch } = usePayrollAllocations({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize, period: periodFilter || undefined });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Payroll Allocation</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Alokasi gaji ke project + corporate overhead (FR-HCM-005)</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            aria-label="Filter periode"
            placeholder="mis. 2026-08"
            value={periodFilter}
            onChange={(e) => { setPeriodFilter(e.target.value); setPagination({ pageIndex: 0, pageSize: PAGE_SIZE }); }}
            className="h-9 w-32"
          />
          <Button size="sm" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Tutup' : '+ Buat Alokasi'}
          </Button>
        </div>
      </div>

      {showForm && <PayrollForm onDone={() => setShowForm(false)} />}

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
          emptyMessage="Belum ada alokasi payroll"
        />
      </div>
    </div>
  );
}
