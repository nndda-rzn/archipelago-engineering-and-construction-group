import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { z } from 'zod';
import { createDailyReportSchema } from '@aec/api-contracts';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useCreateDailyReport } from '../model/work-package.api';

const formSchema = z.object({
  reportDate: z.string(),
  weather: z.string(),
  summary: createDailyReportSchema.shape.summary,
  issues: createDailyReportSchema.shape.issues,
  hseNote: createDailyReportSchema.shape.hseNote,
  equipmentList: createDailyReportSchema.shape.equipmentList,
  materialList: createDailyReportSchema.shape.materialList,
  lines: z.array(z.object({ trade: z.string(), count: z.string(), hours: z.string() })),
});
type FormValues = z.infer<typeof formSchema>;

export function CreateDailyReportForm({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const create = useCreateDailyReport(projectId);
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reportDate: new Date().toISOString().slice(0, 10),
      weather: 'CERAH',
      summary: '',
      issues: '',
      hseNote: '',
      equipmentList: '',
      materialList: '',
      lines: [{ trade: 'KONSTRUKSI', count: '', hours: '' }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });

  const onSubmit = handleSubmit((input) => {
    const manpowerLines = input.lines.filter((l) => l.trade && l.count).map((l) => ({ trade: l.trade, manpowerCount: Number(l.count), hoursWorked: Number(l.hours) || 0 }));
    create.mutate({
      reportDate: input.reportDate,
      weather: input.weather,
      summary: input.summary,
      issues: input.issues || undefined,
      hseNote: input.hseNote || undefined,
      equipmentList: input.equipmentList || undefined,
      materialList: input.materialList || undefined,
      manpowerLines,
    }, { onSuccess: onDone });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-md border border-neutral-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <Label htmlFor="dr-date">Tanggal</Label>
          <Input id="dr-date" type="date" error={!!errors.reportDate} {...register('reportDate')} />
          {errors.reportDate && <p className="mt-1 text-caption text-destructive-600">{errors.reportDate.message}</p>}
        </div>
        <div>
          <Label htmlFor="dr-weather">Cuaca</Label>
          <Controller name="weather" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="dr-weather"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="CERAH">Cerah</SelectItem><SelectItem value="BERAWAN">Berawan</SelectItem><SelectItem value="MENDUNG">Mendung</SelectItem><SelectItem value="HUJAN">Hujan</SelectItem></SelectContent>
            </Select>
          )} />
        </div>
        <div><Label>Manpower (baris)</Label><Button size="sm" variant="secondary" type="button" onClick={() => append({ trade: '', count: '', hours: '' })}>+ Tambah</Button></div>
      </div>
      {fields.map((field, i) => (
        <div key={field.id} className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div><Label>Trade</Label><Input placeholder="KONSTRUKSI" {...register(`lines.${i}.trade` as const)} /></div>
          <div><Label>Jumlah</Label><Input type="number" min={1} placeholder="10" {...register(`lines.${i}.count` as const)} /></div>
          <div><Label>Jam Kerja</Label><Input type="number" min={0} max={24} placeholder="8" {...register(`lines.${i}.hours` as const)} /></div>
          <div className="flex items-end">{fields.length > 1 && <Button size="sm" variant="secondary" type="button" onClick={() => remove(i)}>Hapus</Button>}</div>
        </div>
      ))}
      <div>
        <Label htmlFor="dr-summary">Ringkasan Aktivitas <span aria-hidden="true" className="text-destructive-600">*</span></Label>
        <textarea id="dr-summary" rows={3} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-body-sm" placeholder="Aktivitas utama hari ini..." {...register('summary')} />
        {errors.summary && <p className="mt-1 text-caption text-destructive-600">{errors.summary.message}</p>}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div><Label htmlFor="dr-issues">Masalah Lapangan</Label><Input id="dr-issues" placeholder="Opsional" error={!!errors.issues} {...register('issues')} />{errors.issues && <p className="mt-1 text-caption text-destructive-600">{errors.issues.message}</p>}</div>
        <div><Label htmlFor="dr-hse">Catatan HSE</Label><Input id="dr-hse" placeholder="Opsional" error={!!errors.hseNote} {...register('hseNote')} />{errors.hseNote && <p className="mt-1 text-caption text-destructive-600">{errors.hseNote.message}</p>}</div>
        <div><Label htmlFor="dr-equip">Equipment</Label><Input id="dr-equip" placeholder="Opsional" error={!!errors.equipmentList} {...register('equipmentList')} />{errors.equipmentList && <p className="mt-1 text-caption text-destructive-600">{errors.equipmentList.message}</p>}</div>
        <div><Label htmlFor="dr-mat">Material</Label><Input id="dr-mat" placeholder="Opsional" error={!!errors.materialList} {...register('materialList')} />{errors.materialList && <p className="mt-1 text-caption text-destructive-600">{errors.materialList.message}</p>}</div>
      </div>
      <div className="flex justify-end gap-2"><Button size="sm" variant="secondary" type="button" onClick={onDone}>Batal</Button><Button size="sm" type="submit" loading={create.isPending}>Submit Daily Report</Button></div>
      {create.isError && <p className="text-body-sm text-destructive-600">Gagal menyimpan daily report.</p>}
    </form>
  );
}
