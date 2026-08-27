import { useState } from 'react';
import { Button, Input, Label } from '@aec/ui';
import { useLegalEntities } from '@/entities/legal-entity';
import { useProjects } from '@/entities/project';
import { useCreateAssignment, useCreateEmployee } from '../model/hcm.api';
import type { Employee } from '@aec/api-contracts';

export function EmployeeForm({ onDone }: { onDone: () => void }) {
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
          <select id="emp-entity" value={legalEntityId} onChange={(e) => setLegalEntityId(e.target.value)} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Pilih entity...</option>
            {(entities.data?.items ?? []).map((e) => <option key={e.id} value={e.id}>{e.code} - {e.legalName}</option>)}
          </select>
        </div>
        <div><Label htmlFor="emp-name">Nama</Label><Input id="emp-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label htmlFor="emp-pos">Posisi</Label><Input id="emp-pos" placeholder="mis. Site Engineer" value={position} onChange={(e) => setPosition(e.target.value)} /></div>
        <div><Label htmlFor="emp-grade">Grade</Label><Input id="emp-grade" placeholder="mis. E3" value={grade} onChange={(e) => setGrade(e.target.value)} /></div>
        <div><Label htmlFor="emp-dept">Departemen</Label><Input id="emp-dept" placeholder="mis. Construction" value={department} onChange={(e) => setDepartment(e.target.value)} /></div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="button" onClick={onSubmit} loading={create.isPending}>Buat Employee</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal membuat employee.</p>}
    </div>
  );
}

export function AssignmentForm({ employee }: { employee: Employee }) {
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
        <select id="asg-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body">
          <option value="">Pilih project...</option>
          {(projects.data?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
        </select>
      </div>
      <div><Label htmlFor="asg-role">Peran</Label><Input id="asg-role" placeholder="mis. Site Engineer" value={role} onChange={(e) => setRole(e.target.value)} /></div>
      <div><Label htmlFor="asg-alloc">Alokasi (%)</Label><Input id="asg-alloc" type="number" min={1} max={100} placeholder="mis. 50" value={allocationPercent} onChange={(e) => setAllocationPercent(e.target.value)} /></div>
      <label className="flex h-9 items-center gap-2 text-body-sm text-neutral-600">
        <input type="checkbox" checked={exception} onChange={(e) => setException(e.target.checked)} />
        Exception &gt;100%
      </label>
      <Button onClick={onSubmit} loading={create.isPending}>Tambah Assignment</Button>
      {create.isError && <p className="text-caption text-destructive-600">Gagal (mungkin alokasi &gt;100% tanpa exception).</p>}
    </div>
  );
}
