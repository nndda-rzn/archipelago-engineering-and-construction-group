import { useState } from 'react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useWorkPackages } from '@/features/construction';
import { useCreateProgressClaim } from '../model/progress-claim.api';
import { claimTypeLabel } from './progress-claim-grid';

const CLAIM_TYPES = ['PROGRESS', 'COST', 'TIME', 'EOT', 'CONTRACTUAL'] as const;

export function ClaimForm({ onDone }: { onDone: () => void }) {
  const [projectId, setProjectId] = useState('');
  const [period, setPeriod] = useState('');
  const [claimType, setClaimType] = useState('PROGRESS');
  const [amount, setAmount] = useState(0);
  const [requestedExtensionDays, setRequestedExtensionDays] = useState('');
  const [description, setDescription] = useState('');
  const [workPackageId, setWorkPackageId] = useState('');
  const [billableProgress, setBillableProgress] = useState('');
  const projects = useProjects({ page: 1, pageSize: 100 });
  const { data: workPackages } = useWorkPackages(projectId, { page: 1, pageSize: 100 });
  const create = useCreateProgressClaim();
  const selectedWp = workPackages?.items.find((w) => w.id === workPackageId);
  const isTimeType = claimType === 'TIME' || claimType === 'EOT';

  const onSubmit = () => {
    if (!projectId || amount <= 0) return;
    create.mutate(
      {
        projectId,
        period: period || undefined,
        amount,
        claimType: claimType !== 'PROGRESS' ? claimType : undefined,
        requestedExtensionDays: isTimeType && requestedExtensionDays ? Number(requestedExtensionDays) : undefined,
        description: description || undefined,
        workPackageId: workPackageId || undefined,
        physicalProgressAtClaim: selectedWp?.latestProgress ?? undefined,
        billableProgress: billableProgress ? Number(billableProgress) : undefined,
      },
      { onSuccess: () => { setPeriod(''); setAmount(0); setDescription(''); setWorkPackageId(''); setBillableProgress(''); setRequestedExtensionDays(''); setClaimType('PROGRESS'); onDone(); } },
    );
  };

  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="clm-project">Project</Label>
          <Select value={projectId} onValueChange={(v) => { setProjectId(v); setWorkPackageId(''); }}>
            <SelectTrigger id="clm-project"><SelectValue placeholder="Pilih project…" /></SelectTrigger>
            <SelectContent>
              {(projects.data?.items ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="clm-type">Tipe Klaim</Label>
          <Select value={claimType} onValueChange={setClaimType}>
            <SelectTrigger id="clm-type"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CLAIM_TYPES.map((t) => <SelectItem key={t} value={t}>{t} — {claimTypeLabel[t]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label htmlFor="clm-period">Periode</Label><Input id="clm-period" placeholder="mis. 2026-08" value={period} onChange={(e) => setPeriod(e.target.value)} /></div>
        <div><Label htmlFor="clm-amount">Nilai Klaim</Label><Input id="clm-amount" type="number" min={0} step={100000} value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} /></div>
        {isTimeType && <div><Label htmlFor="clm-eot">Requested Extension Days</Label><Input id="clm-eot" type="number" min={1} max={3650} value={requestedExtensionDays} onChange={(e) => setRequestedExtensionDays(e.target.value)} /></div>}
        <div>
          <Label htmlFor="clm-wp">Work Package</Label>
          <Select value={workPackageId} onValueChange={setWorkPackageId} disabled={!projectId}>
            <SelectTrigger id="clm-wp"><SelectValue placeholder="Tanpa work package" /></SelectTrigger>
            <SelectContent>
              {(workPackages?.items ?? []).map((w) => <SelectItem key={w.id} value={w.id}>{w.wpNumber} — {w.title} ({w.latestProgress ?? 0}%)</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label htmlFor="clm-billable">Billable Progress (%)</Label><Input id="clm-billable" type="number" min={0} max={100} value={billableProgress} onChange={(e) => setBillableProgress(e.target.value)} disabled={!selectedWp} /></div>
        <div><Label htmlFor="clm-desc">Deskripsi</Label><Input id="clm-desc" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      </div>
      <div className="mt-4 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onDone}>Batal</Button><Button type="button" onClick={onSubmit} loading={create.isPending}>Buat Klaim DRAFT</Button></div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal membuat klaim.</p>}
    </div>
  );
}
