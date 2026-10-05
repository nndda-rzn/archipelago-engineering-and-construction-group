import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { z } from 'zod';
import { Button, Input, Label, EntitySelect } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useEmployees, useCreatePayrollAllocation } from '../model/hcm.api';
import { formatIdr as fmt } from '@/shared/lib/format';

const formSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  projectId: z.string(),
  period: z.string().min(1, 'Period is required'),
  gross: z.string().min(1, 'Gross payroll is required').refine((v) => Number(v) >= 0, 'Gross cannot be negative'),
  projectAmount: z.string().refine((v) => !v || Number(v) >= 0, 'Allocation cannot be negative'),
});
type FormValues = z.infer<typeof formSchema>;

export function PayrollForm({ onDone }: { onDone: () => void }) {
  const employees = useEmployees({ page: 1, pageSize: 100 });
  const projects = useProjects({ page: 1, pageSize: 100 });
  const create = useCreatePayrollAllocation();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { employeeId: '', projectId: '', period: '', gross: '', projectAmount: '' },
  });

  const gross = useWatch({ control, name: 'gross' });
  const projectAmount = useWatch({ control, name: 'projectAmount' });
  const overhead = gross && projectAmount ? Math.max(Number(gross) - Number(projectAmount), 0) : 0;
  const balanced = gross && projectAmount ? Number(gross) - Number(projectAmount) >= 0 : false;

  const onSubmit = handleSubmit((input) =>
    create.mutate(
      {
        employeeId: input.employeeId,
        projectId: input.projectId || undefined,
        period: input.period,
        grossAmount: Number(input.gross),
        projectAmount: Number(input.projectAmount || 0),
        overheadAmount: overhead,
      },
      { onSuccess: () => { reset(); onDone(); } },
    )
  );

  return (
    <form onSubmit={onSubmit} className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="pa-emp">Employee <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Controller name="employeeId" control={control} render={({ field }) => (
            <EntitySelect value={field.value} onValueChange={field.onChange} options={(employees.data?.items ?? []).map((e) => ({ value: e.id, label: `${e.employeeNumber} · ${e.name}` }))} placeholder="Select employee…" searchPlaceholder="Search employee…" />
          )} />
          {errors.employeeId && <p className="mt-1 text-caption text-destructive-600">{errors.employeeId.message}</p>}
        </div>
        <div>
          <Label htmlFor="pa-period">Period <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="pa-period" placeholder="e.g. 2026-08" error={!!errors.period} {...register('period')} />
          {errors.period && <p className="mt-1 text-caption text-destructive-600">{errors.period.message}</p>}
        </div>
        <div>
          <Label htmlFor="pa-project">Project (optional)</Label>
          <Controller name="projectId" control={control} render={({ field }) => (
            <EntitySelect value={field.value} onValueChange={field.onChange} options={[{ value: '', label: 'Corporate overhead' }, ...(projects.data?.items ?? []).map((p) => ({ value: p.id, label: p.code }))]} placeholder="Corporate overhead" searchPlaceholder="Search project…" />
          )} />
        </div>
        <div />
        <div>
          <Label htmlFor="pa-gross">Gross Payroll <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="pa-gross" type="number" min={0} step={100000} error={!!errors.gross} {...register('gross')} />
          {errors.gross && <p className="mt-1 text-caption text-destructive-600">{errors.gross.message}</p>}
        </div>
        <div>
          <Label htmlFor="pa-project-amt">Allocation to Project</Label>
          <Input id="pa-project-amt" type="number" min={0} step={100000} error={!!errors.projectAmount} {...register('projectAmount')} />
          {errors.projectAmount && <p className="mt-1 text-caption text-destructive-600">{errors.projectAmount.message}</p>}
        </div>
      </div>
      <p className={`mt-2 text-caption ${balanced ? 'text-success-700' : 'text-destructive-600'}`}>Auto overhead: {fmt(overhead)} · {balanced ? 'balanced OK (gross = project + overhead)' : 'allocation exceeds gross'}</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" loading={create.isPending} disabled={!balanced}>Create Allocation</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600" role="alert">Failed to create the payroll allocation.</p>}
    </form>
  );
}
