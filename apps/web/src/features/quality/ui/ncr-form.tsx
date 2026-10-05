import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { createNcrSchema } from '@aec/api-contracts';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useCreateNcr } from '../model/quality.api';
import { ProjectSelect, WpSelect, useProjectOptions } from './quality-selects';

const formSchema = z.object({
  description: createNcrSchema.shape.description,
  severity: z.enum(['MINOR', 'MAJOR', 'CRITICAL']),
  category: z.enum(['WORKMANSHIP', 'MATERIAL', 'DESIGN', 'DOCUMENT']),
  wpId: z.string(),
});
type FormValues = z.infer<typeof formSchema>;

export function NcrForm({ onDone }: { onDone: () => void }) {
  const { projectId, setProjectId, workPackages } = useProjectOptions();
  const create = useCreateNcr();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { description: '', severity: 'MINOR', category: 'WORKMANSHIP', wpId: '' },
  });

  const onSubmit = handleSubmit((input) =>
    create.mutate(
      { category: input.category, severity: input.severity, description: input.description, workPackageId: input.wpId || undefined },
      { onSuccess: () => { reset(); onDone(); } },
    )
  );

  return (
    <form onSubmit={onSubmit} className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <ProjectSelect projectId={projectId} setProjectId={setProjectId} />
        <Controller name="wpId" control={control} render={({ field }) => (
          <WpSelect id="ncr-wp" projectId={projectId} value={field.value} onChange={field.onChange} workPackages={workPackages} />
        )} />
        <div>
          <Label htmlFor="ncr-cat">Kategori</Label>
          <Controller name="category" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="ncr-cat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WORKMANSHIP">WORKMANSHIP</SelectItem>
                <SelectItem value="MATERIAL">MATERIAL</SelectItem>
                <SelectItem value="DESIGN">DESIGN</SelectItem>
                <SelectItem value="DOCUMENT">DOCUMENT</SelectItem>
              </SelectContent>
            </Select>
          )} />
        </div>
        <div>
          <Label htmlFor="ncr-sev">Severity</Label>
          <Controller name="severity" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="ncr-sev">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MINOR">MINOR</SelectItem>
                <SelectItem value="MAJOR">MAJOR</SelectItem>
                <SelectItem value="CRITICAL">CRITICAL</SelectItem>
              </SelectContent>
            </Select>
          )} />
        </div>
        <div className="flex-1">
          <Label htmlFor="ncr-desc">NCR Description <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="ncr-desc" error={!!errors.description} {...register('description')} />
          {errors.description && <p className="mt-1 text-caption text-destructive-600">{errors.description.message}</p>}
        </div>
        <Button type="submit" loading={create.isPending}>Buat NCR</Button>
      </div>
    </form>
  );
}
