import { useState } from 'react';
import { Button, Input, Label, EntitySelect } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useEmployees, useCreateTimesheet } from '../model/hcm.api';

export function TimesheetForm({ onDone }: { onDone: () => void }) {
  const [employeeId, setEmployeeId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [hours, setHours] = useState('');
  const [activity, setActivity] = useState('');
  const projects = useProjects({ page: 1, pageSize: 100 });
  const employees = useEmployees({ page: 1, pageSize: 100 });
  const create = useCreateTimesheet();

  const onSubmit = () => {
    if (!employeeId || !projectId || !hours) return;
    create.mutate({ employeeId, projectId, hours: Number(hours), activity: activity || undefined }, { onSuccess: () => { setEmployeeId(''); setProjectId(''); setHours(''); setActivity(''); onDone(); } });
  };

  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-2 gap-4">
        <div><Label htmlFor="ts-emp">Karyawan</Label><EntitySelect value={employeeId} onValueChange={setEmployeeId} options={(employees.data?.items ?? []).map((e) => ({ value: e.id, label: `${e.employeeNumber} — ${e.name}` }))} placeholder="Pilih karyawan…" searchPlaceholder="Cari karyawan…" /></div>
        <div><Label htmlFor="ts-project">Project</Label><EntitySelect value={projectId} onValueChange={setProjectId} options={(projects.data?.items ?? []).map((p) => ({ value: p.id, label: p.code }))} placeholder="Pilih project…" searchPlaceholder="Cari project…" /></div>
        <div><Label htmlFor="ts-hours">Jam Kerja</Label><Input id="ts-hours" type="number" min={0.5} max={24} step={0.5} placeholder="mis. 8" value={hours} onChange={(e) => setHours(e.target.value)} /></div>
        <div><Label htmlFor="ts-activity">Aktivitas</Label><Input id="ts-activity" placeholder="mis. Ereksi baja" value={activity} onChange={(e) => setActivity(e.target.value)} /></div>
      </div>
      <div className="mt-4 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onDone}>Batal</Button><Button type="button" onClick={onSubmit} loading={create.isPending}>Kirim Timesheet</Button></div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal mengirim timesheet.</p>}
    </div>
  );
}
