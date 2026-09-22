import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { createTimesheetSchema } from '@aec/api-contracts';
import { Button, Input, Label, EntitySelect } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useEmployees, useCreateTimesheet } from '../model/hcm.api';

const formSchema = z.object({
  employeeId: z.string().min(1, 'Karyawan wajib dipilih'),
  projectId: z.string().min(1, 'Project wajib dipilih'),
  hours: z.string().min(1, 'Jam kerja wajib diisi').refine((v) => Number(v) >= 0.5 && Number(v) <= 24, 'Jam kerja harus 0.5–24'),
  activity: createTimesheetSchema.shape.activity,
});
type FormValues = z.infer<typeof formSchema>;

export function TimesheetForm({ onDone }: { onDone: () => void }) {
  const projects = useProjects({ page: 1, pageSize: 100 });
  const employees = useEmployees({ page: 1, pageSize: 100 });
  const create = useCreateTimesheet();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { employeeId: '', projectId: '', hours: '', activity: '' },
  });

  const onSubmit = handleSubmit((input) =>
    create.mutate(
      { employeeId: input.employeeId, projectId: input.projectId, hours: Number(input.hours), activity: input.activity || undefined },
      { onSuccess: () => { reset(); onDone(); } },
    )
  );

  return (
    <form onSubmit={onSubmit} className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ts-emp">Karyawan <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Controller name="employeeId" control={control} render={({ field }) => (
            <EntitySelect value={field.value} onValueChange={field.onChange} options={(employees.data?.items ?? []).map((e) => ({ value: e.id, label: `${e.employeeNumber} — ${e.name}` }))} placeholder="Pilih karyawan…" searchPlaceholder="Cari karyawan…" />
          )} />
          {errors.employeeId && <p className="mt-1 text-caption text-destructive-600">{errors.employeeId.message}</p>}
        </div>
        <div>
          <Label htmlFor="ts-project">Project <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Controller name="projectId" control={control} render={({ field }) => (
            <EntitySelect value={field.value} onValueChange={field.onChange} options={(projects.data?.items ?? []).map((p) => ({ value: p.id, label: p.code }))} placeholder="Pilih project…" searchPlaceholder="Cari project…" />
          )} />
          {errors.projectId && <p className="mt-1 text-caption text-destructive-600">{errors.projectId.message}</p>}
        </div>
        <div>
          <Label htmlFor="ts-hours">Jam Kerja <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="ts-hours" type="number" min={0.5} max={24} step={0.5} placeholder="mis. 8" error={!!errors.hours} {...register('hours')} />
          {errors.hours && <p className="mt-1 text-caption text-destructive-600">{errors.hours.message}</p>}
        </div>
        <div>
          <Label htmlFor="ts-activity">Aktivitas</Label>
          <Input id="ts-activity" placeholder="mis. Ereksi baja" error={!!errors.activity} {...register('activity')} />
          {errors.activity && <p className="mt-1 text-caption text-destructive-600">{errors.activity.message}</p>}
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="submit" loading={create.isPending}>Kirim Timesheet</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600" role="alert">Gagal mengirim timesheet.</p>}
    </form>
  );
}
