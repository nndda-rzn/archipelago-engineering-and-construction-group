import { useState } from 'react';
import { Button, DataGrid, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import {
  useCreateEquipment, useCreateEquipmentAssignment, useCreateEquipmentBreakdown,
  useCreateEquipmentPm, useCreateEquipmentUsage, useCreateEquipmentUtilization,
  useEquipmentAssignments, useEquipmentBreakdowns, useEquipmentPms,
} from '../model/hcm.api';
import type { Equipment } from '@aec/api-contracts';
import { useProjects } from '@/entities/project';
import { assignmentColumns, breakdownColumns, pmColumns } from './equipment-columns';

export function EquipmentForm({ onDone }: { onDone: () => void }) {
  const create = useCreateEquipment();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('HEAVY');
  const [serialNumber, setSerialNumber] = useState('');
  const onSubmit = () => {
    if (!name) return;
    create.mutate(
      { name, category, serialNumber: serialNumber || undefined },
      { onSuccess: () => { setName(''); setSerialNumber(''); onDone(); } },
    );
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="eq-name">Name</Label>
          <Input id="eq-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="eq-cat">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="eq-cat">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['HEAVY', 'LIGHT', 'LIFTING', 'TRANSPORT', 'GENERATOR', 'OTHER'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="eq-serial">Serial</Label>
          <Input id="eq-serial" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Create Equipment</Button>
      </div>
    </div>
  );
}

export function EquipmentDetail({ equipment }: { equipment: Equipment }) {
  const projects = useProjects({ page: 1, pageSize: 100 });
  const assignments = useEquipmentAssignments(equipment.id);
  const pms = useEquipmentPms(equipment.id);
  const breakdowns = useEquipmentBreakdowns(equipment.id);

  const createAssign = useCreateEquipmentAssignment();
  const createPm = useCreateEquipmentPm();
  const createBd = useCreateEquipmentBreakdown();
  const createUsage = useCreateEquipmentUsage();
  const createUtil = useCreateEquipmentUtilization();

  const [assignProject, setAssignProject] = useState('');
  const [pmTrigger, setPmTrigger] = useState('METER_BASED');
  const [pmMeter, setPmMeter] = useState('');
  const [downtime, setDowntime] = useState('');
  const [cost, setCost] = useState('');
  const [availHours, setAvailHours] = useState('');
  const [operHours, setOperHours] = useState('');
  const [usageHours, setUsageHours] = useState('');
  const [usageCost, setUsageCost] = useState('');
  const [usageProject, setUsageProject] = useState('');

  return (
    <div className="mt-6 space-y-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div>
        <h2 className="text-h2 text-neutral-950">{equipment.equipmentNumber} · {equipment.name}</h2>
        <p className="text-caption text-neutral-500">{equipment.category} · Status: {equipment.status} · Meter: {Number(equipment.currentMeter).toLocaleString('id-ID')} hrs</p>
      </div>

      <div>
        <h3 className="mb-2 text-h3 text-neutral-800">Assignment</h3>
        <div className="mb-3 flex items-end gap-3">
          <div>
            <Label htmlFor="as-proj">Project</Label>
            <Select value={assignProject} onValueChange={setAssignProject}>
              <SelectTrigger id="as-proj">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {(projects.data?.items ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={() => { if (assignProject) createAssign.mutate({ equipmentId: equipment.id, projectId: assignProject }, { onSuccess: () => setAssignProject('') }); }} loading={createAssign.isPending}>Assign</Button>
        </div>
        <DataGrid columns={assignmentColumns} data={assignments.data?.items ?? []} emptyMessage="No assignments yet" hideToolbar />
      </div>

      <div>
        <h3 className="mb-2 text-h3 text-neutral-800">Preventive Maintenance</h3>
        <div className="mb-3 flex items-end gap-3">
          <div>
            <Label htmlFor="pm-trig">Trigger</Label>
            <Select value={pmTrigger} onValueChange={setPmTrigger}>
              <SelectTrigger id="pm-trig">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['METER_BASED', 'DATE_BASED', 'CONDITION_BASED'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label htmlFor="pm-meter">Due Meter</Label><Input id="pm-meter" type="number" value={pmMeter} onChange={(e) => setPmMeter(e.target.value)} className="w-28" /></div>
          <Button size="sm" onClick={() => { if (pmMeter) createPm.mutate({ equipmentId: equipment.id, triggerType: pmTrigger, dueMeter: Number(pmMeter) }, { onSuccess: () => setPmMeter('') }); }} loading={createPm.isPending}>Create PM</Button>
        </div>
        <DataGrid columns={pmColumns} data={pms.data?.items ?? []} emptyMessage="No PM yet" hideToolbar />
      </div>

      <div>
        <h3 className="mb-2 text-h3 text-neutral-800">Breakdown</h3>
        <div className="mb-3 flex items-end gap-3">
          <div><Label htmlFor="bd-dt">Downtime (hrs)</Label><Input id="bd-dt" type="number" value={downtime} onChange={(e) => setDowntime(e.target.value)} className="w-24" /></div>
          <div><Label htmlFor="bd-cost">Cost Impact</Label><Input id="bd-cost" type="number" value={cost} onChange={(e) => setCost(e.target.value)} className="w-32" /></div>
          <Button size="sm" onClick={() => { if (downtime) createBd.mutate({ equipmentId: equipment.id, downtimeHours: Number(downtime), costImpact: cost ? Number(cost) : undefined }, { onSuccess: () => { setDowntime(''); setCost(''); } }); }} loading={createBd.isPending}>Record</Button>
        </div>
        <DataGrid columns={breakdownColumns} data={breakdowns.data?.items ?? []} emptyMessage="No breakdowns yet" hideToolbar />
      </div>

      <div>
        <h3 className="mb-2 text-h3 text-neutral-800">Utilization & Usage</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div><Label htmlFor="avail-hrs">Available (hrs)</Label><Input id="avail-hrs" type="number" value={availHours} onChange={(e) => setAvailHours(e.target.value)} className="w-24" /></div>
          <div><Label htmlFor="oper-hrs">Operating (hrs)</Label><Input id="oper-hrs" type="number" value={operHours} onChange={(e) => setOperHours(e.target.value)} className="w-24" /></div>
          <Button size="sm" variant="secondary" onClick={() => { if (availHours && operHours) createUtil.mutate({ equipmentId: equipment.id, availableHours: Number(availHours), operatingHours: Number(operHours) }, { onSuccess: () => { setAvailHours(''); setOperHours(''); } }); }} loading={createUtil.isPending}>Record Utilization</Button>
          <div>
            <Label htmlFor="usage-proj">Project</Label>
            <Select value={usageProject} onValueChange={setUsageProject}>
              <SelectTrigger id="usage-proj">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {(projects.data?.items ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label htmlFor="usage-hrs">Usage Hours</Label><Input id="usage-hrs" type="number" value={usageHours} onChange={(e) => setUsageHours(e.target.value)} className="w-24" /></div>
          <div><Label htmlFor="usage-cost">Cost</Label><Input id="usage-cost" type="number" value={usageCost} onChange={(e) => setUsageCost(e.target.value)} className="w-28" /></div>
          <Button size="sm" variant="secondary" onClick={() => { if (usageHours && usageProject && usageCost) createUsage.mutate({ equipmentId: equipment.id, projectId: usageProject, hours: Number(usageHours), costAmount: Number(usageCost) }, { onSuccess: () => { setUsageHours(''); setUsageCost(''); } }); }} loading={createUsage.isPending}>Update Meter</Button>
        </div>
      </div>
    </div>
  );
}
