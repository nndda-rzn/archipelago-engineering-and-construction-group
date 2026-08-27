import { useState } from 'react';
import { Button, Input, Label, EntitySelect } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useEmployees, useCreatePayrollAllocation } from '../model/hcm.api';
import { formatIdr as fmt } from '@/shared/lib/format';

export function PayrollForm({ onDone }: { onDone: () => void }) {
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
    create.mutate({ employeeId, projectId: projectId || undefined, period, grossAmount: Number(gross), projectAmount: Number(projectAmount || 0), overheadAmount: overhead }, { onSuccess: () => { setEmployeeId(''); setProjectId(''); setPeriod(''); setGross(''); setProjectAmount(''); onDone(); } });
  };

  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-2 gap-4">
        <div><Label htmlFor="pa-emp">Karyawan</Label><EntitySelect value={employeeId} onValueChange={setEmployeeId} options={(employees.data?.items ?? []).map((e) => ({ value: e.id, label: `${e.employeeNumber} — ${e.name}` }))} placeholder="Pilih karyawan…" searchPlaceholder="Cari karyawan…" /></div>
        <div><Label htmlFor="pa-period">Periode</Label><Input id="pa-period" placeholder="mis. 2026-08" value={period} onChange={(e) => setPeriod(e.target.value)} /></div>
        <div><Label htmlFor="pa-project">Project (opsional)</Label><EntitySelect value={projectId} onValueChange={setProjectId} options={[{ value: '', label: 'Corporate overhead' }, ...(projects.data?.items ?? []).map((p) => ({ value: p.id, label: p.code }))]} placeholder="Corporate overhead" searchPlaceholder="Cari project…" /></div>
        <div />
        <div><Label htmlFor="pa-gross">Gross Payroll</Label><Input id="pa-gross" type="number" min={0} step={100000} value={gross} onChange={(e) => setGross(e.target.value)} /></div>
        <div><Label htmlFor="pa-project-amt">Alokasi ke Project</Label><Input id="pa-project-amt" type="number" min={0} step={100000} value={projectAmount} onChange={(e) => setProjectAmount(e.target.value)} /></div>
      </div>
      <p className={`mt-2 text-caption ${balanced ? 'text-emerald-700' : 'text-destructive-600'}`}>Overhead otomatis: {fmt(overhead)} — {balanced ? 'balance OK (gross = project + overhead)' : 'alokasi melebihi gross'}</p>
      <div className="mt-4 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onDone}>Batal</Button><Button type="button" onClick={onSubmit} loading={create.isPending} disabled={!balanced}>Buat Alokasi</Button></div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal membuat alokasi payroll.</p>}
    </div>
  );
}
