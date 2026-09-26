import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useWorkPackages } from '@/features/construction';
import { useCreateProgressClaim } from '../model/progress-claim.api';
import { claimTypeLabel } from './progress-claim-grid';

const CLAIM_TYPES = ['PROGRESS', 'COST', 'TIME', 'EOT', 'CONTRACTUAL'] as const;

const formSchema = z.object({
  projectId: z.string().min(1, 'Project wajib dipilih'),
  period: z.string().max(30),
  claimType: z.enum(['PROGRESS', 'COST', 'TIME', 'EOT', 'CONTRACTUAL']),
  amount: z.string().refine((v) => Number(v) > 0, 'Nilai klaim harus lebih dari 0'),
  requestedExtensionDays: z.string(),
  workPackageId: z.string(),
  billableProgress: z.string(),
  description: z.string().max(500),
});
type FormValues = z.infer<typeof formSchema>;

export function ClaimForm({ onDone }: { onDone: () => void }) {
  const projects = useProjects({ page: 1, pageSize: 100 });
  const create = useCreateProgressClaim();
  const { register, handleSubmit, reset, control, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { projectId: '', period: '', claimType: 'PROGRESS', amount: '', requestedExtensionDays: '', workPackageId: '', billableProgress: '', description: '' },
  });

  const projectId = useWatch({ control, name: 'projectId' });
  const claimType = useWatch({ control, name: 'claimType' });
  const workPackageId = useWatch({ control, name: 'workPackageId' });
  const { data: workPackages } = useWorkPackages(projectId, { page: 1, pageSize: 100 });
  const selectedWp = workPackages?.items.find((w) => w.id === workPackageId);
  const isTimeType = claimType === 'TIME' || claimType === 'EOT';

  const onSubmit = handleSubmit((input) =>
    create.mutate(
      {
        projectId: input.projectId,
        period: input.period || undefined,
        amount: Number(input.amount),
        claimType: input.claimType !== 'PROGRESS' ? input.claimType : undefined,
        requestedExtensionDays: isTimeType && input.requestedExtensionDays ? Number(input.requestedExtensionDays) : undefined,
        description: input.description || undefined,
        workPackageId: input.workPackageId || undefined,
        physicalProgressAtClaim: selectedWp?.latestProgress ?? undefined,
        billableProgress: input.billableProgress ? Number(input.billableProgress) : undefined,
      },
      { onSuccess: () => { reset(); onDone(); } },
    )
  );

  return (
    <form onSubmit={onSubmit} className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="clm-project">Project <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Controller name="projectId" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={(v) => { field.onChange(v); setValue('workPackageId', ''); }}>
              <SelectTrigger id="clm-project"><SelectValue placeholder="Pilih project…" /></SelectTrigger>
              <SelectContent>
                {(projects.data?.items ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
          {errors.projectId && <p className="mt-1 text-caption text-destructive-600">{errors.projectId.message}</p>}
        </div>
        <div>
          <Label htmlFor="clm-type">Tipe Klaim</Label>
          <Controller name="claimType" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="clm-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CLAIM_TYPES.map((t) => <SelectItem key={t} value={t}>{t} · {claimTypeLabel[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </div>
        <div><Label htmlFor="clm-period">Periode</Label><Input id="clm-period" placeholder="mis. 2026-08" {...register('period')} /></div>
        <div>
          <Label htmlFor="clm-amount">Nilai Klaim <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="clm-amount" type="number" min={0} step={100000} error={!!errors.amount} {...register('amount')} />
          {errors.amount && <p className="mt-1 text-caption text-destructive-600">{errors.amount.message}</p>}
        </div>
        {isTimeType && <div><Label htmlFor="clm-eot">Requested Extension Days</Label><Input id="clm-eot" type="number" min={1} max={3650} {...register('requestedExtensionDays')} /></div>}
        <div>
          <Label htmlFor="clm-wp">Work Package</Label>
          <Controller name="workPackageId" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange} disabled={!projectId}>
              <SelectTrigger id="clm-wp"><SelectValue placeholder="Tanpa work package" /></SelectTrigger>
              <SelectContent>
                {(workPackages?.items ?? []).map((w) => <SelectItem key={w.id} value={w.id}>{w.wpNumber} · {w.title} ({w.latestProgress ?? 0}%)</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </div>
        <div><Label htmlFor="clm-billable">Billable Progress (%)</Label><Input id="clm-billable" type="number" min={0} max={100} disabled={!selectedWp} {...register('billableProgress')} /></div>
        <div><Label htmlFor="clm-desc">Deskripsi</Label><Input id="clm-desc" {...register('description')} /></div>
      </div>
      <div className="mt-4 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onDone}>Batal</Button><Button type="submit" loading={create.isPending}>Buat Klaim DRAFT</Button></div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal membuat klaim.</p>}
    </form>
  );
}
