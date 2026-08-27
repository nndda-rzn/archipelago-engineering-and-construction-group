import { useState } from 'react';
import { Button, Input, Label } from '@aec/ui';
import { useCreateControlAccount, useCreateCostCode, useCreateForecast } from '../model/project-controls.api';
import { useWbsTree } from '@/entities/wbs';

export function CostCodeForm({ projectId }: { projectId: string }) {
  const { data: wbs } = useWbsTree(projectId);
  const create = useCreateCostCode(projectId);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [wbsItemId, setWbsItemId] = useState('');
  const [costType, setCostType] = useState('DIRECT');
  const onSubmit = () => {
    if (!code || !name) return;
    create.mutate({ code, name, wbsItemId: wbsItemId || undefined, costType }, { onSuccess: () => { setCode(''); setName(''); setWbsItemId(''); } });
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div><Label htmlFor="cc-code">Kode</Label><Input id="cc-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="MAT-01" /></div>
        <div className="flex-1"><Label htmlFor="cc-name">Nama</Label><Input id="cc-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div>
          <Label htmlFor="cc-wbs">WBS</Label>
          <select id="cc-wbs" value={wbsItemId} onChange={(e) => setWbsItemId(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">-</option>
            {(wbs ?? []).map((w) => <option key={w.id} value={w.id}>{w.code} {w.name}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="cc-type">Tipe</Label>
          <select id="cc-type" value={costType} onChange={(e) => setCostType(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            {['DIRECT', 'INDIRECT', 'LABOR', 'MATERIAL', 'SUBCONTRACTOR', 'EQUIPMENT', 'OVERHEAD'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat Cost Code</Button>
      </div>
    </div>
  );
}

export function ControlAccountForm({ projectId }: { projectId: string }) {
  const { data: wbs } = useWbsTree(projectId);
  const create = useCreateControlAccount(projectId);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [wbsItemId, setWbsItemId] = useState('');
  const [responsibleManager, setResponsibleManager] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [plannedValue, setPlannedValue] = useState('');
  const onSubmit = () => {
    if (!code || !name || !wbsItemId || !responsibleManager) return;
    create.mutate(
      { code, name, wbsItemId, responsibleManager, budgetAmount: budgetAmount ? Number(budgetAmount) : undefined, plannedValue: plannedValue ? Number(plannedValue) : undefined },
      { onSuccess: () => { setCode(''); setName(''); setWbsItemId(''); setResponsibleManager(''); setBudgetAmount(''); setPlannedValue(''); } },
    );
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div><Label htmlFor="ca-code">Kode</Label><Input id="ca-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="CA-1" /></div>
        <div className="flex-1"><Label htmlFor="ca-name">Nama</Label><Input id="ca-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div>
          <Label htmlFor="ca-wbs">WBS</Label>
          <select id="ca-wbs" value={wbsItemId} onChange={(e) => setWbsItemId(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Pilih…</option>
            {(wbs ?? []).map((w) => <option key={w.id} value={w.id}>{w.code} {w.name}</option>)}
          </select>
        </div>
        <div><Label htmlFor="ca-mgr">Responsible</Label><Input id="ca-mgr" value={responsibleManager} onChange={(e) => setResponsibleManager(e.target.value)} /></div>
        <div><Label htmlFor="ca-budget">Budget</Label><Input id="ca-budget" type="number" min={0} value={budgetAmount} onChange={(e) => setBudgetAmount(e.target.value)} className="w-28" /></div>
        <div><Label htmlFor="ca-pv">PV</Label><Input id="ca-pv" type="number" min={0} value={plannedValue} onChange={(e) => setPlannedValue(e.target.value)} className="w-28" /></div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat CA</Button>
      </div>
    </div>
  );
}

export function ForecastForm({ projectId }: { projectId: string }) {
  const create = useCreateForecast(projectId);
  const [period, setPeriod] = useState('');
  const [eac, setEac] = useState('');
  const [etc, setEtc] = useState('');
  const onSubmit = () => {
    if (!period || !eac) return;
    create.mutate({ period, estimateAtCompletion: Number(eac), estimateToComplete: etc ? Number(etc) : undefined }, { onSuccess: () => { setPeriod(''); setEac(''); setEtc(''); } });
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div><Label htmlFor="fc-period">Periode</Label><Input id="fc-period" value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-08" /></div>
        <div><Label htmlFor="fc-eac">EAC</Label><Input id="fc-eac" type="number" min={0} value={eac} onChange={(e) => setEac(e.target.value)} /></div>
        <div><Label htmlFor="fc-etc">ETC (opsional)</Label><Input id="fc-etc" type="number" min={0} value={etc} onChange={(e) => setEtc(e.target.value)} /></div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat Forecast</Button>
      </div>
    </div>
  );
}
